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
      origin: "https://groupsor.link",
      referer: "https://groupsor.link/group/search",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search(query, page = 0, limit = 5) {
    const url = `https://groupsor.link/group/searchmore/${encodeURIComponent(query)}`;
    try {
      const response = await this.client.post(url, `group_no=${page}`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      $(".maindiv#results").each((_, element) => {
        const categories = $(element).find(".post-basic-info span").map((_, el) => ({
          name: $(el).find("a").text().trim(),
          link: $(el).find("a").attr("href")
        })).get();
        const link = $(element).find('a[target="_blank"]').attr("href");
        results.push({
          link: link,
          title: $(element).find("span.gtitle").text().trim(),
          description: $(element).find(".descri").text().trim(),
          country: categories[0]?.name || "Unknown",
          language: categories[1]?.name || "Unknown",
          categories: categories
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
      const joinLink = $('a.btn[target="_blank"]').attr("href") || "No join link available";
      const additionalInfo = await this.getLink(joinLink);
      return {
        date: $('div[style="height: 30px;text-align: center"] .cate').text().trim() || "Unknown Date",
        description: $("pre.predesc").text().trim() || "No description available",
        joinLink: joinLink,
        shareLink: $('a.btn[href^="whatsapp://send"]').attr("href") || "No share link available",
        ...additionalInfo
      };
    } catch (error) {
      console.error("Error occurred while fetching info:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async getLink(joinLink) {
    try {
      const response = await this.client.get(joinLink.replace("invite", "join"), {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      return {
        headline: $(".headline h1").text().trim() || "No headline available",
        link: $(".button1").attr("href") || "No join button available",
        description: $(".article-content p").map((_, el) => $(el).text().trim()).get().join("\n") || "No description available"
      };
    } catch (error) {
      console.error("Error occurred while fetching join link:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    limit = 5,
    page = 0
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
        result = await search.search(query, page, limit);
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