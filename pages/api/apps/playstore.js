import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Playstore {
  constructor() {
    this.baseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v2?url=`;
  }
  async fetchData(url) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}${encodeURIComponent(url)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      return cheerio.load(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  }
  async search(q, lang = "id") {
    const url = `https://play.google.com/work/search?q=${encodeURIComponent(q)}&hl=${lang}`;
    const $ = await this.fetchData(url);
    if (!$) return [];
    return $(".Vpfmgd").map((i, el) => {
      const title = $(el).find(".WsMG1c").text().trim();
      const link = "https://play.google.com" + ($(el).find("a").attr("href") || "");
      const developer = $(el).find(".KoLSrc").eq(0).text().trim();
      const rating = $(el).find(".pf5lIe div").attr("aria-label") || "No rating";
      const image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src") || "";
      const price = $(el).find(".VfPpfd span").eq(0).text().trim() || "Free";
      return {
        title: title,
        link: link,
        developer: developer,
        rating: rating,
        image: image,
        price: price
      };
    }).get();
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const apk = new Playstore();
  try {
    switch (action) {
      case "search":
        return res.status(200).json(await apk.search(query));
      default:
        return res.status(400).json({
          message: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}