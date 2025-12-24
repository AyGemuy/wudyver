import axios from "axios";
import * as cheerio from "cheerio";
class MetroTV {
  constructor() {
    this.baseURL = "https://www.metrotvnews.com";
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
      $(".main-news .big-news-carousel .news-item, .main-news .small-news .news-item").each((i, el) => {
        const title = $(el).find("h1 a, h2 a").text().trim();
        const url = $(el).find("h1 a, h2 a").attr("href");
        const img = $(el).find("img").attr("src") || "";
        const kategori = $(el).find(".news-category").text().trim();
        if (title && url) {
          const fullUrl = url.startsWith("http") ? url : this.baseURL + url;
          hasil.push({
            title: title,
            url: fullUrl,
            thumbnail: img.startsWith("http") ? img : this.baseURL + img,
            kategori: kategori
          });
        }
      });
      const detailPromises = hasil.slice(0, limit).map(item => this.getDetail(item.url));
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
      const title = $('meta[property="og:title"]').attr("content") || $("title").text().trim();
      const description = $('meta[property="og:description"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || "";
      const publishedAt = $('meta[name="content_PublishedDate"]').attr("content") || "";
      const content = [];
      $("p").each((i, el) => {
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
  try {
    const scraper = new MetroTV();
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}