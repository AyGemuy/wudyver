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
      origin: "https://whtsgrouplink.org",
      referer: "https://whtsgrouplink.org/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search({
    query,
    limit = 5
  }) {
    const url = `https://whtsgrouplink.org/?s=${encodeURIComponent(query)}`;
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      let count = 0;
      const articleElements = $(".generate-columns-container article");
      for (const element of articleElements) {
        if (count >= limit) {
          break;
        }
        const link = $(element).find("h2.entry-title a").attr("href");
        const title = $(element).find("h2.entry-title").text().trim();
        const description = $(element).find(".entry-summary p").first().text().trim();
        const image = $(element).find(".post-image img").attr("src");
        if (link) {
          const infoResult = await this.info(link);
          results.push({
            nama_grup: infoResult?.title || title || null,
            deskripsi_singkat: description || null,
            gambar: image || null,
            link_grup: infoResult?.group?.[0]?.link || null,
            nama_link_grup: infoResult?.group?.[0]?.name || null
          });
          count++;
        }
      }
      return {
        limit: limit,
        list: results.filter(item => item.link_grup)
      };
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
      const title = $("h2.wp-block-heading strong").text().trim() || null;
      const groupLinks = [];
      $("ul.wp-block-list li").each((_, element) => {
        const link = $(element).find("a").attr("href");
        const text = $(element).text().trim() || null;
        if (link?.includes("whatsapp")) {
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
      return {};
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