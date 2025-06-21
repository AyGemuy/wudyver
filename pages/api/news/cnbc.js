import axios from "axios";
import * as cheerio from "cheerio";
class CnbcNews {
  constructor() {
    this.baseURL = "https://www.cnbcindonesia.com/news";
  }
  async getNews({
    limit = 5
  } = {}) {
    try {
      const {
        data
      } = await axios.get(this.baseURL);
      const $ = cheerio.load(data);
      const hasil = [];
      $("article").each((i, el) => {
        if (hasil.length >= limit) return false;
        const anchor = $(el).find("a");
        const url = anchor.attr("href");
        const img = $(el).find("img").attr("src");
        const title = $(el).find("h2").text().trim();
        if (url && title && img) {
          hasil.push({
            status: 200,
            title: title,
            url: url,
            thumb: img
          });
        }
      });
      const detailPromises = hasil.map(item => this.getDetail(item.url));
      const details = await Promise.all(detailPromises);
      details.forEach((detail, index) => {
        hasil[index].detail = detail;
      });
      return hasil;
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
      const title = $("h1").text().trim();
      const description = $('meta[name="description"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || "";
      const publishedAt = $("time").attr("datetime") || "";
      const content = [];
      $(".detail-text p").each((i, el) => {
        const text = $(el).text().trim();
        if (text) content.push(text);
      });
      return {
        title: title,
        description: description,
        image: image,
        publishedAt: publishedAt,
        text: content.join("\n")
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
  const scraper = new CnbcNews();
  try {
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}