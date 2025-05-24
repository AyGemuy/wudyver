import axios from "axios";
import * as cheerio from "cheerio";
class AntaraNews {
  constructor() {
    this.baseURL = "https://www.antaranews.com/top-news";
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
      $(".card__post.card__post-list.card__post__transition.mt-30").each((i, el) => {
        if (hasil.length >= limit) return false;
        const anchor = $(el).find(".card__post__title h2 a");
        const url = anchor.attr("href");
        const img = $(el).find("picture img.lazyload").attr("data-src");
        const title = anchor.attr("title");
        const time = $(el).find(".card__post__author-info .text-secondary").text().trim();
        if (url && title && img && time) {
          hasil.push({
            status: 200,
            title: title,
            url: url,
            thumb: img,
            time: time
          });
        }
      });
      const detailPromises = hasil.map(item => this.getDetail(item.url));
      const details = await Promise.all(detailPromises);
      details.forEach((detail, index) => {
        if (detail && detail.status !== false) {
          hasil[index].detail = detail;
        } else {
          console.warn(`Failed to fetch detail for URL: ${hasil[index].url}`, detail);
          hasil[index].detail = {
            status: false,
            message: "Detail fetch failed"
          };
        }
      });
      return hasil;
    } catch (err) {
      console.error("Error fetching news list:", err);
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
      const title = $(".wrap__article-detail-title h1").text().trim() || $('meta[property="og:title"]').attr("content") || "";
      const description = $('meta[property="og:description"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || "";
      const publishedAt = $(".wrap__article-detail-info .text-secondary").first().text().trim();
      const content = [];
      $(".wrap__article-detail-content.post-content p").each((i, el) => {
        const text = $(el).text().trim();
        if (text && !$(el).find("script").length) {
          content.push(text);
        }
      });
      if (!title || content.length === 0) {
        return {
          status: false,
          url: url,
          message: "Could not extract necessary detail information (title or content)."
        };
      }
      return {
        status: 200,
        title: title,
        description: description,
        image: image,
        publishedAt: publishedAt,
        text: content.join("\n")
      };
    } catch (err) {
      console.error(`Error fetching detail for ${url}:`, err);
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
  const scraper = new AntaraNews();
  try {
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}