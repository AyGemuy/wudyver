import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class StickerFetcher {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchData(query, params = {}) {
    try {
      const {
        page,
        ...extraParams
      } = params;
      let url = `https://combot.org/stickers?q=${encodeURIComponent(query)}`;
      if (page) url += `&page=${page}`;
      if (Object.keys(extraParams).length) {
        url += `&${new URLSearchParams(extraParams).toString()}`;
      }
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const pages = $(".pagination li a").map((i, el) => ({
        page: $(el).text().trim(),
        url: $(el).attr("href")
      })).get();
      const stickerSets = $(".stickerset").map((i, el) => {
        const dataAttr = $(el).attr("data-data");
        if (!dataAttr) return null;
        const data = JSON.parse(dataAttr.replace(/&quot;/g, '"'));
        return {
          id: data._id,
          title: data.title,
          created: data.created_date,
          updated: data.updated_date,
          uses: data.uses,
          type: data.sticker_type,
          emojis: data.stickers,
          url: $(el).find(".stickerset__image").get().map(img => $(img).attr("data-src")),
          telegram: `https://t.me/addstickers/${data._id}`
        };
      }).get();
      return {
        pages: pages,
        stickers: stickerSets,
        total_pages: pages.length
      };
    } catch (error) {
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
      throw new Error("Failed to fetch sticker data");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      q = "car",
        page, ...extraParams
    } = req.query;
    const fetcher = new StickerFetcher();
    const data = await fetcher.fetchData(q, {
      page: page,
      ...extraParams
    });
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}