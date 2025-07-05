import axios from "axios";
import * as cheerio from "cheerio";
class VivaNews {
  constructor() {
    this.baseURL = "https://www.viva.co.id/berita";
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
      $(".article-list-row").each((i, el) => {
        if (hasil.length >= limit) return false;
        const link = $(el).find("a.article-list-thumb-link").attr("href");
        const thumb = $(el).find("a.article-list-thumb-link img").attr("src") || "";
        const title = $(el).find(".article-list-title h2").text().trim();
        const category = $(el).find(".article-list-cate h3").text().trim();
        const time = $(el).find(".article-list-date span").text().trim();
        const description = $(el).find(".article-list-desc").text().trim();
        if (link && title) {
          hasil.push({
            status: 200,
            title: title,
            url: link,
            thumb: thumb,
            category: category,
            publishedAt: time,
            description: description
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
      const title = $("meta[property='og:title']").attr("content") || $("title").text().trim();
      const description = $("meta[property='og:description']").attr("content") || "";
      const image = $("meta[property='og:image']").attr("content") || "";
      const publishedAt = $(".date").text().trim() || "";
      const content = [];
      $(".main-content-detail p").each((i, el) => {
        const text = $(el).text().trim();
        if (text && !text.includes("Baca Juga")) content.push(text);
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
  const viva = new VivaNews();
  try {
    const data = await viva.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}