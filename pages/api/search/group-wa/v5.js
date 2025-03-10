import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class Scraper {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.headers = {
      accept: "text/html, */*; q=0.01",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://whtsgrouplink.org",
      referer: "https://whtsgrouplink.org/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search(query, limit = 5) {
    const url = `https://whtsgrouplink.org/?s=${encodeURIComponent(query)}`;
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      $(".generate-columns-container article").each((_, element) => {
        const link = $(element).find("h2.entry-title a").attr("href");
        const title = $(element).find("h2.entry-title").text().trim();
        const description = $(element).find(".entry-summary p").first().text().trim();
        const image = $(element).find(".post-image img").attr("src");
        results.push({
          link: link,
          title: title,
          description: description,
          image: image
        });
      });
      const limitedResults = results.slice(0, limit);
      const infoResults = await Promise.all(limitedResults.map(result => this.info(result.link)));
      return limitedResults.map((result, index) => ({
        ...result,
        ...infoResults[index]
      }));
    } catch (error) {
      console.error("Error occurred:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async info(url) {
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const title = $("h2.wp-block-heading strong").text().trim() || "Unknown Title";
      const groupLinks = [];
      $("ul.wp-block-list li").each((_, element) => {
        const link = $(element).find("a").attr("href");
        const text = $(element).text().trim() || "No description";
        if (link.includes("whatsapp")) {
          groupLinks.push({
            name: text,
            link: link
          });
        }
      });
      return {
        title: title,
        group: groupLinks
      };
    } catch (error) {
      console.error("Error occurred while fetching info:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    limit = 5
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const search = new Scraper();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await search.search(query, limit);
        break;
      case "info":
        if (!url) return res.status(400).json({
          error: "URL is required for info"
        });
        result = await search.info(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}