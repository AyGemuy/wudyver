import axios from "axios";
import * as cheerio from "cheerio";
class RepublikaNews {
  constructor() {
    this.baseURL = "https://m.republika.co.id/kanal/news";
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
      $("a.article-item").each((i, el) => {
        if (hasil.length >= limit) return false;
        const anchor = $(el);
        const url = anchor.attr("href");
        const title = anchor.find("h3.card-title").text().trim();
        const img = anchor.find("img").attr("src");
        const category = anchor.find("small.text-primary").text().trim();
        const time = anchor.find("small.text-muted").text().trim();
        if (url && title && img) {
          hasil.push({
            status: 200,
            title: title,
            url: url.startsWith("https://") ? url : `https://news.republika.co.id${url}`,
            thumb: img,
            category: category,
            time: time
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
      const title = $("h1.title-article").text().trim() || $('meta[property="og:title"]').attr("content") || "";
      const description = $('meta[property="og:description"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || "";
      const publishedAt = $("div.time").text().trim();
      const content = [];
      $("article p").each((i, el) => {
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
  const scraper = new RepublikaNews();
  try {
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}