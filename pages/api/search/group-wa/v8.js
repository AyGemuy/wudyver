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
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.baseUrl = "https://www.grouplinker.site";
  }
  extractImageUrl(urlString) {
    try {
      const url = new URL(this.baseUrl + urlString);
      return url.searchParams.get("url");
    } catch (error) {
      console.error("Error parsing image URL:", error);
      return null;
    }
  }
  async search({
    query,
    limit = 5
  }) {
    const url = `${this.baseUrl}/search/${encodeURIComponent(query)}`;
    try {
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      let count = 0;
      $(".custom-media > div").each((_, element) => {
        if (count >= limit) {
          return false;
        }
        const groupNameElement = $(element).find("h3.text-base.font-medium.mb-2");
        const joinLinkElement = $(element).find('a[href^="https://chat.whatsapp.com/"] button.bg-green-500');
        const imageElement = $(element).find(".w-20.h-20.overflow-hidden.rounded-full img");
        const rawImageSrc = imageElement.attr("src");
        const imageUrl = rawImageSrc ? this.extractImageUrl(rawImageSrc) : null;
        const groupName = groupNameElement.text().trim() || null;
        const joinLink = joinLinkElement.parent().attr("href") || null;
        if (groupName && joinLink) {
          results.push({
            group_name: groupName,
            join_link: joinLink,
            image: imageUrl
          });
          count++;
        }
      });
      return {
        limit: limit,
        query: query,
        list: results
      };
    } catch (error) {
      console.error("Error during search:", error.response ? error.response.data : error.message);
      return {
        error: error.message
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