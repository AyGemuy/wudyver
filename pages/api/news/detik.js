import axios from "axios";
import * as cheerio from "cheerio";
class DetikNews {
  constructor() {
    this.baseURL = "https://news.detik.com/";
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
      const seenUrls = new Set();
      let articleCount = 0;
      const selectors = ["article.ph_newsfeed_m", "article.article_inview", "article.list-content__item", "article", "div.news", "div.list-content"];
      for (const selector of selectors) {
        console.log(`Mencoba selector: ${selector}`);
        $(selector).each((i, el) => {
          articleCount++;
          const article = $(el);
          const a = article.find("a.block-link, a");
          const url = a.attr("href");
          console.log(`  Artikel ke-${articleCount}, URL: ${url}`);
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            const title = a.find("div").text().trim();
            const thumb = article.find("span.ratiobox").css("background-image") || "";
            const imageMatch = thumb.match(/url\("([^"]+)"\)/);
            const imageUrl = imageMatch ? imageMatch[1] : null;
            hasil.push({
              status: 200,
              title: title,
              url: url,
              thumb: imageUrl
            });
          }
        });
        if (hasil.length > 0) break;
      }
      console.log(`Total artikel ditemukan: ${articleCount}`);
      console.log(`Total URL unik: ${hasil.length}`);
      const filtered = hasil.slice(0, limit);
      const detailPromises = filtered.map(item => this.getDetail(item.url));
      const details = await Promise.all(detailPromises);
      details.forEach((detail, i) => {
        filtered[i].detail = detail;
      });
      return filtered;
    } catch (err) {
      console.error("Error:", err);
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
      const title = $("h1.detail__title").text().trim();
      const image = $(".detail__media-image img").attr("src") || "";
      const author = $(".detail__author").text().trim();
      const publishedAt = $(".detail__date").text().trim();
      const content = [];
      $(".detail__body-text p").each((i, el) => {
        const text = $(el).text().trim();
        if (text) content.push(text);
      });
      return {
        title: title,
        author: author,
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
    const scraper = new DetikNews();
    const data = await scraper.getNews(params);
    return res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}