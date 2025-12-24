import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class GroupScraper {
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
  async search({
    query,
    result_limit = 5,
    group_limit = 5
  }) {
    const url = `https://whatsgrouplink.com/?s=${encodeURIComponent(query)}`;
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      const articleElements = $("article");
      for (const element of articleElements) {
        if (results.length >= result_limit) {
          break;
        }
        const $element = $(element);
        const pageLink = $element.find("h2.entry-title a").attr("href");
        const title = $element.find("h2.entry-title").text().trim();
        const description = $element.find(".entry-meta time").text().trim() || null;
        if (pageLink) {
          const infoResult = await this.info(pageLink, group_limit);
          results.push({
            link: pageLink,
            title: title,
            description: description,
            list: infoResult?.group || []
          });
        }
      }
      return {
        result_limit: result_limit,
        group_limit: group_limit,
        list: results.filter(item => item.list && item.list.length > 0)
      };
    } catch (error) {
      console.error("Error occurred during search:", error.response ? error.response.data : error.message);
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
      const pageTitle = titleElement.text().trim() || $("h2.wp-block-heading:first-of-type").text().trim() || "Unknown Title";
      const groupLinks = [];
      const linkElements = $('ul.wp-block-list li a[href*="whatsapp"]');
      for (const element of linkElements) {
        if (groupLinks.length >= limit) {
          break;
        }
        const $linkElement = $(element);
        const link = $linkElement.attr("href");
        const text = $linkElement.text().trim() || null;
        if (link) {
          groupLinks.push({
            nama: text,
            link: link
          });
        }
      }
      return {
        title: pageTitle,
        group: groupLinks
      };
    } catch (error) {
      console.error("Error occurred while fetching info for:", url, error.response ? error.response.data : error.message);
      return {
        title: "Error fetching title",
        group: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const api = new GroupScraper();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}