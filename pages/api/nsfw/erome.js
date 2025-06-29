import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search(query, order) {
    try {
      const searchUrl = `https://www.erome.com/search?q=${encodeURIComponent(query)}${order ? `&o=${encodeURIComponent(order)}` : ""}`;
      const link = encodeURIComponent(searchUrl);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const albums = $(".album").map((i, el) => ({
        title: $(el).find(".album-title").text().trim(),
        url: $(el).find(".album-title").attr("href"),
        user: $(el).find(".album-user").text().trim(),
        thumbnail: $(el).find(".album-thumbnail").data("src"),
        views: $(el).find(".album-bottom-views").text().trim()
      })).get();
      return albums.length ? albums : {
        message: "No albums found for the query"
      };
    } catch (error) {
      return {
        status: false,
        error: error.message || error
      };
    }
  }
  async detail(url) {
    try {
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      return {
        title: $("h1").text().trim() || "No Title",
        user: {
          name: $(".user-info #user_name").text().trim() || "Unknown User",
          avatar: $(".user-info #user_icon img").attr("src") || "default-avatar.png"
        },
        username: $("#user_name").text().trim(),
        userProfileImage: $("#user_icon img").attr("src"),
        userProfileLink: $("#user_name").attr("href"),
        videoCount: $(".album-videos").text().trim(),
        views: $(".fa-eye").parent().text().trim(),
        likes: $(".fa-heart").next("b").text().trim(),
        reposts: $(".album-repost b").text().trim(),
        videoUrl: $("video source").attr("src"),
        tags: $("p.mt-10 a").map((i, el) => $(el).text().trim()).get(),
        media: $(".media-group").map((i, el) => ({
          img: $(el).find(".img").data("src") || null,
          video: $(el).find("video source").attr("src") || null,
          caption: $(el).find("img").attr("alt") || "No Text"
        })).get()
      };
    } catch (error) {
      return {
        status: false,
        error: error.message || error
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    order
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new Downloader();
    let result;
    switch (action) {
      case "search":
        result = query ? await downloader.search(query, order) : {
          error: "Query is required for search"
        };
        break;
      case "detail":
        result = url ? await downloader.detail(url) : {
          error: "URL is required for detail"
        };
        break;
      default:
        result = {
          error: `Invalid action: ${action}`
        };
    }
    res.status(result.error ? 400 : 200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}