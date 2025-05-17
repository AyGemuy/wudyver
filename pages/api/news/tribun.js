import axios from "axios";
import * as cheerio from "cheerio";
class Tribun {
  constructor() {
    this.baseURL = "https://m.tribunnews.com/news";
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
      $("#latestul li").each((i, el) => {
        const beritaUrl = $(el).find("a").attr("href");
        const beritaTitle = $(el).find("h3 a").text().trim();
        const beritaCategory = $(el).find("h4 a").text().trim();
        const beritaDate = $(el).find("time.foot span.foot").text().trim();
        const beritaImage = $(el).find("img").attr("src");
        const result = {
          status: 200,
          title: beritaTitle || "No Title",
          url: `https://m.tribunnews.com${beritaUrl}` || "No URL",
          category: beritaCategory || "No Category",
          date: beritaDate || "No Date",
          image: beritaImage || "No Image"
        };
        hasil.push(result);
      });
      const filteredResults = hasil.slice(0, limit);
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
      const content = [];
      $("div.txt-article.multi-fontsize.mb20").each((i, el) => {
        const text = $(el).text().trim();
        if (text) content.push(text);
      });
      return {
        title: title,
        description: description,
        image: image,
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
    const scraper = new Tribun();
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}