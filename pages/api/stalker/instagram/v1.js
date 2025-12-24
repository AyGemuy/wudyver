import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class WebScraper {
  constructor() {
    this.baseHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
    this.baseResultUrl = "https://imginn.com";
  }
  async search(query, limit = 1, type = "post") {
    try {
      const res = await axios.get(`${this.baseHtml}${encodeURIComponent("https://imginn.com/search?q=" + query)}`);
      const $ = cheerio.load(res.data);
      const results = [];
      $(".tab-item.user-item").each((i, el) => {
        if (i >= limit) return false;
        const link = this.baseResultUrl + $(el).attr("href");
        const title = $(el).find(".fullname span").text().trim();
        const name = $(el).find(".username").text().trim();
        const img = $(el).find(".img img").attr("src");
        const desc = $(el).find(".info").text().trim();
        results.push({
          link: link,
          title: title,
          name: name,
          img: img,
          desc: desc
        });
      });
      const detailedResults = await Promise.all(results.map(async result => {
        const username = result.name.slice(1);
        const detail = await this.detail(username, type);
        return {
          ...result,
          detail: detail
        };
      }));
      return detailedResults;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }
  async detail(username, type = "post") {
    try {
      const detailUrl = type === "tagged" ? `https://imginn.com/tagged/${username}` : type === "stories" ? `https://imginn.com/stories/${username}` : `https://imginn.com/${username}`;
      const res = await axios.get(`${this.baseHtml}${encodeURIComponent(detailUrl)}`);
      const $ = cheerio.load(res.data);
      const user = {};
      user.name = $(".userinfo").data("name");
      user.verified = $(".userinfo").data("verified");
      user.avatar = $(".userinfo .img img").attr("src");
      user.bio = $(".bio").text().trim();
      user.posts = $(".counter-item").eq(0).find(".num").text().trim();
      user.followers = $(".counter-item").eq(1).find(".num").text().trim();
      user.following = $(".counter-item").eq(2).find(".num").text().trim();
      const media = [];
      $(".items .item").each((i, el) => {
        const link = this.baseResultUrl + $(el).find("a").attr("href");
        const img = $(el).find("img").attr("src");
        const desc = $(el).find("img").attr("alt");
        const time = $(el).find(".time").text().trim();
        const dl = $(el).find(".download").attr("href");
        const fullImgUrl = img.startsWith("//") ? `https:${img}` : img;
        media.push({
          link: link,
          img: fullImgUrl,
          desc: desc,
          time: time,
          dl: dl
        });
      });
      user.media = media;
      return user;
    } catch (error) {
      console.error("Error fetching detail:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    query,
    limit,
    type
  } = req.method === "POST" ? req.body : req.query;
  if (!query) {
    return res.status(400).json({
      message: "query is required."
    });
  }
  try {
    const Scraper = new WebScraper();
    const result = await Scraper.search(query, limit, type);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}