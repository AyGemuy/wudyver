import axios from "axios";
import * as cheerio from "cheerio";
class DailyNewsIndonesia {
  constructor() {
    this.baseURL = "https://dailynewsindonesia.com";
  }
  async getNews({
    limit = 5
  } = {}) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/category/news/`);
      const $ = cheerio.load(data);
      const hasil = [];
      $(".jeg_post").each((_, el) => {
        const title = $(el).find(".jeg_post_title a").text().trim();
        const url = $(el).find(".jeg_post_title a").attr("href");
        const thumb = $(el).find(".jeg_thumb img").attr("src");
        const category = $(el).find(".jeg_post_category span a").text().trim();
        const date = $(el).find(".jeg_meta_date a").text().trim();
        if (title && url && thumb) {
          hasil.push({
            status: 200,
            title: title,
            url: url,
            thumb: thumb,
            category: category,
            publishedAt: date
          });
        }
      });
      const limited = hasil.slice(0, limit);
      const details = await Promise.all(limited.map(item => this.getDetail(item.url)));
      details.forEach((detail, i) => {
        limited[i].detail = detail;
      });
      return limited;
    } catch (err) {
      return {
        status: false,
        message: err.message
      };
    }
  }
  async getDetail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const title = $(".entry-header .jeg_post_title").text().trim();
      const image = $(".jeg_featured img").attr("src");
      const content = [];
      $(".entry-content .content-inner p").each((_, el) => {
        const text = $(el).text().trim();
        if (text) content.push(text);
      });
      return {
        title: title,
        image: image,
        text: content.join("\n\n")
      };
    } catch (err) {
      return {
        status: false,
        url: url,
        message: "Gagal mengambil detail",
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const scraper = new DailyNewsIndonesia();
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}