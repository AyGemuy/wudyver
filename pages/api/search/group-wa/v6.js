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
      origin: "https://whatsgrouplink.com",
      referer: "https://whatsgrouplink.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search(query, result_limit = 5, group_limit = 5) {
    const url = `https://whatsgrouplink.com/?s=${encodeURIComponent(query)}`;
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      let count = 0;
      const articleElements = $("article");
      for (const element of articleElements) {
        if (count >= result_limit) {
          break;
        }
        const pageLink = $(element).find("h2.entry-title a").attr("href");
        const title = $(element).find("h2.entry-title").text().trim();
        const description = $(element).find(".entry-meta time").text().trim() || null;
        if (pageLink) {
          const infoResult = await this.info(pageLink, group_limit);
          results.push({
            link: pageLink,
            title: title,
            description: description,
            list: infoResult?.group || []
          });
          count++;
        }
      }
      return {
        result_limit: result_limit,
        group_limit: group_limit,
        list: results.filter(item => item.list.length > 0)
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
      const titleElement = $("h2.wp-block-heading:first-of-type strong");
      const title = titleElement.text().trim() || $("h2.wp-block-heading:first-of-type").text().trim() || null;
      const groupLinks = [];
      $('ul.wp-block-list li a[href*="whatsapp"]').each((index, element) => {
        if (index < limit) {
          const link = $(element).attr("href");
          const text = $(element).text().trim() || null;
          if (link) {
            groupLinks.push({
              nama: text,
              link: link
            });
          }
        }
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