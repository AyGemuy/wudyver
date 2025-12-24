import axios from "axios";
import * as cheerio from "cheerio";
class BBCIndonesia {
  constructor() {
    this.baseURL = "https://www.bbc.com/indonesia";
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
      $('ul[data-testid="topic-promos"] > li').each((i, el) => {
        if (hasil.length >= limit) return false;
        const elLink = $(el).find("a");
        const elImg = $(el).find("img");
        const elDesc = $(el).find("p");
        const elTime = $(el).find("time");
        const url = elLink.attr("href")?.startsWith("http") ? elLink.attr("href") : `https://www.bbc.com${elLink.attr("href")}`;
        const title = elLink.text().trim();
        const thumb = elImg.attr("src");
        const description = elDesc.text().trim();
        const published = elTime.text().trim();
        if (url && title) {
          hasil.push({
            status: 200,
            title: title,
            url: url,
            thumb: thumb,
            description: description,
            published: published
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
      const title = $('meta[property="og:title"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || "";
      const description = $('meta[property="og:description"]').attr("content") || "";
      const content = [];
      $('p[dir="ltr"]').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt) content.push(txt);
      });
      return {
        title: title,
        image: image,
        description: description,
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
  const scraper = new BBCIndonesia();
  try {
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}