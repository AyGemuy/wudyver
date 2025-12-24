import axios from "axios";
import * as cheerio from "cheerio";
class LapanFont {
  constructor() {
    this.headers = {
      "User-Agent": "Postify/1.0.0",
      referer: "https://8font.com/"
    };
  }
  async search(query, page = "1") {
    try {
      const {
        data
      } = await axios.get(`https://8font.com/page/${page}/?s=${encodeURIComponent(query)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const fonts = $(".card-body").map((_, el) => ({
        title: $(el).find(".entry-title a").text(),
        link: $(el).find(".btn-primary").attr("href"),
        categories: $(el).find(".post-info a").map((_, e) => $(e).text()).get(),
        date: $(el).find(".post-info").contents().first().text().trim(),
        image: $(el).closest(".card").find("img").attr("src")
      })).get();
      return fonts.length ? {
        fonts: fonts
      } : {};
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const getInfo = n => $(`table tbody tr:nth-child(${n}) td:nth-child(2)`).text().trim();
      return {
        font_name: $(".card-title").first().text(),
        image: $(".card-image img").attr("src"),
        date: getInfo(1),
        designer: getInfo(2),
        font_family: getInfo(3),
        font_style: getInfo(4),
        categories: $("table tbody tr:nth-child(5) td:nth-child(2) a").map((_, el) => $(el).text()).get().join(", "),
        dl_count: getInfo(6),
        link: $("a.btn-primary.my-2").attr("href")
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  const lapanFont = new LapanFont();
  try {
    if (method === "GET") {
      const {
        action,
        q,
        page,
        url
      } = query;
      if (action === "search") {
        if (!q) return res.status(400).json({
          error: "Query is required"
        });
        const result = await lapanFont.search(q, page || "1");
        return res.status(200).json(result);
      }
      if (action === "detail") {
        if (!url) return res.status(400).json({
          error: "URL is required"
        });
        const result = await lapanFont.detail(url);
        return res.status(200).json(result);
      }
      return res.status(400).json({
        error: "Invalid action"
      });
    }
    return res.status(405).json({
      error: "Method not allowed"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}