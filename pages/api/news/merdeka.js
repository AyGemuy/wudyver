import axios from "axios";
import * as cheerio from "cheerio";
class MerdekaNews {
  constructor() {
    this.baseURL = "https://www.merdeka.com/peristiwa";
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
      $("div.box-headline ul li.item").each((i, el) => {
        if (hasil.length >= limit) return false;
        const anchor = $(el).find('a[data-track="mav_sub_click_track"]').first();
        const url = anchor.attr("href");
        const title = $(el).find("span.item-title a").text().trim();
        const thumb = $(el).find("a.item-img img").attr("src");
        const time = $(el).find("time.item-date").attr("datetime");
        if (url && title && thumb) {
          hasil.push({
            status: 200,
            title: title,
            url: `https://www.merdeka.com${url}`,
            thumb: thumb,
            publishedAt: time
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
      const title = $("h1.article-title").text().trim();
      const description = $("p.article-sinopsis").text().trim();
      const image = $("figure.article-asset img").attr("src");
      const publishedAt = $("time.text-xs span").first().text().trim();
      const content = [];
      $("div.article-detail-text").find("p").each((i, el) => {
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
  const scraper = new MerdekaNews();
  try {
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}