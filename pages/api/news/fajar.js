import axios from "axios";
import * as cheerio from "cheerio";
class FajarNews {
  constructor() {
    this.baseURL = "https://fajar.co.id/category/nasional/";
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
        const anchor = $(el).find(".post-thumbnail");
        const url = anchor.attr("href");
        const img = anchor.find("img").attr("src");
        const title = $(el).find(".entry-title a").text().trim();
        const author = $(el).find(".author.vcard a").text().trim();
        const date = $(el).find(".fa-clock-o").parent().text().trim();
        if (url && title && img) {
          hasil.push({
            status: 200,
            title: title,
            url: url,
            thumb: img,
            author: author,
            date: date
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
      const title = $("h1.entry-title").text().trim();
      const description = $('meta[property="og:description"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || "";
      const publishedAt = $("span.posted-on").text().trim();
      const content = [];
      $(".entry-content p").each((i, el) => {
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
  const scraper = new FajarNews();
  try {
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}