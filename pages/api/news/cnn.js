import axios from "axios";
import * as cheerio from "cheerio";
class CNNIndonesia {
  constructor() {
    this.baseURL = "https://www.cnnindonesia.com";
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
        const berita = $(el).find("a").attr("href");
        const y = $(el).find("img").attr("alt");
        const img = $(el).find("img").attr("src");
        const jenis = $(el).find("span.date").text().trim();
        const result = {
          status: 200,
          title: y || "No Title",
          url: berita || "No URL",
          thumb: img || "No Image"
        };
        hasil.push(result);
      });
      const filteredResults = hasil.filter(v => v.title !== "No Title" && v.url !== "No URL" && v.thumb !== "No Image").slice(0, limit);
      const detailPromises = filteredResults.map(item => this.getDetail(item.url));
      const details = await Promise.all(detailPromises);
      details.forEach((detail, index) => {
        filteredResults[index].detail = detail;
      });
      return filteredResults;
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
      const title = $('meta[property="og:title"]').attr("content") || "";
      const description = $('meta[property="og:description"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || "";
      const publishedAt = $("strong").first().text().trim() || "";
      const content = [];
      $(".detail-text > p").each((i, el) => {
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
    const scraper = new CNNIndonesia();
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}