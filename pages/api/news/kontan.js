import axios from "axios";
import * as cheerio from "cheerio";
class KontanNews {
  constructor() {
    this.baseURL = "https://www.kontan.co.id/terpopuler";
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
      $("section-left div.list-berita ul li").each((i, el) => {
        if (hasil.length >= limit) return false;
        const anchor = $(el).find("a");
        const url = anchor.attr("href");
        const title = $(el).find("div.ket h1 a").text().trim();
        const img = $(el).find("a div.pic img").attr("src");
        const timeElement = $(el).find("div.ket div.fs14");
        const category = timeElement.find("span.linkto-orange a").text().trim();
        const timeText = timeElement.text().split("|")[1]?.trim();
        const publishedAt = `${category} | ${timeText}`;
        if (url && title && img) {
          hasil.push({
            status: 200,
            title: title,
            url: url,
            thumb: img,
            publishedAt: publishedAt
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
  const scraper = new KontanNews();
  try {
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}