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
      origin: "https://justgroup.link",
      referer: "https://justgroup.link/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search({
    query,
    result_limit = 5,
    group_limit = 5
  }) {
    const url = `https://justgroup.link/?s=${encodeURIComponent(query)}`;
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      const articleElements = $("article.entry");
      for (const element of articleElements) {
        if (results.length >= result_limit) {
          break;
        }
        const $element = $(element);
        const link = $element.find("h2.entry-title a").attr("href");
        const title = $element.find("h2.entry-title").text().trim();
        const image = $element.find(".post-thumbnail img").attr("src");
        if (link) {
          const infoResult = await this.info(link, group_limit);
          results.push({
            link: link,
            title: title,
            image: image,
            group: infoResult?.group || []
          });
        }
      }
      return {
        result_limit: result_limit,
        group_limit: group_limit,
        list: results
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
      const pageTitle = $(".entry-title").text().trim() || "Unknown Title";
      const groupLinks = [];
      const columnElements = $(".wp-block-kadence-column");
      for (const columnEl of columnElements) {
        if (groupLinks.length >= limit) break;
        const $column = $(columnEl);
        const tableElements = $column.find("figure.wp-block-table");
        for (const tableEl of tableElements) {
          if (groupLinks.length >= limit) break;
          const $table = $(tableEl);
          const rowElements = $table.find("tbody tr");
          for (const rowEl of rowElements) {
            if (groupLinks.length >= limit) {
              break;
            }
            const $row = $(rowEl);
            const groupName = $row.find("td").first().text().trim();
            const link = $row.find("a").attr("href");
            if (link?.includes("whatsapp")) {
              groupLinks.push({
                nama: groupName,
                link: link
              });
            }
          }
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