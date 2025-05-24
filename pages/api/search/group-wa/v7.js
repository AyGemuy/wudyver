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
      origin: "https://justgroup.link",
      referer: "https://justgroup.link/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search(query, result_limit = 5, group_limit = 5) {
    const url = `https://justgroup.link/?s=${encodeURIComponent(query)}`;
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      let pageCount = 0;
      const articleElements = $("article.entry");
      for (const element of articleElements) {
        if (pageCount >= result_limit) {
          break;
        }
        const link = $(element).find("h2.entry-title a").attr("href");
        const title = $(element).find("h2.entry-title").text().trim();
        const image = $(element).find(".post-thumbnail img").attr("src");
        if (link) {
          const infoResult = await this.info(link, group_limit);
          results.push({
            link: link,
            title: title,
            image: image,
            group: infoResult?.group || []
          });
          pageCount++;
        }
      }
      return {
        result_limit: result_limit,
        group_limit: group_limit,
        list: results
      };
    } catch (error) {
      console.error("Error occurred:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async info(url, limit) {
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const title = $(".entry-title").text().trim() || "Unknown Title";
      const groupLinks = [];
      let groupCount = 0;
      $(".wp-block-kadence-column").each((_, column) => {
        $(column).find("figure.wp-block-table").each((_, table) => {
          $(table).find("tbody tr").each((_, row) => {
            if (groupCount < limit) {
              const groupName = $(row).find("td").first().text().trim();
              const link = $(row).find("a").attr("href");
              if (link?.includes("whatsapp")) {
                groupLinks.push({
                  nama: groupName,
                  link: link
                });
                groupCount++;
              }
            }
          });
        });
      });
      return {
        title: title,
        group: groupLinks
      };
    } catch (error) {
      console.error("Error occurred while fetching info:", error.response ? error.response.data : error.message);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    result_limit = 1,
    group_limit = 3
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
        result = await search.search(query, result_limit, group_limit);
        break;
      case "info":
        if (!url) return res.status(400).json({
          error: "URL is required for info"
        });
        result = await search.info(url, group_limit);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}