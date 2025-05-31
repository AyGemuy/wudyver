import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search(query) {
    try {
      const link = encodeURIComponent(`https://javhd.com/en/search?q=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v2?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      return $ ? $("thumb-component").map((_, el) => ({
        title: $(el).attr("title") || "Tidak ada judul",
        url: $(el).attr("link-content") || "Tidak ada link",
        thumbnail: $(el).attr("url-thumb") || "Tidak ada thumbnail",
        preview: $(el).attr("video-preview") || "Tidak ada preview",
        views: $(el).attr("views") || "0",
        likes: $(el).attr("likes") || "0",
        hasLabel: $(el).attr("has-label") || "Tidak ada label"
      })).get() : [];
    } catch (error) {
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async detail(url) {
    try {
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v2?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const videoUrl = `https://javhd.com${$("player-component").attr("content-path") || ""}`;
      const {
        data: media
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v2?url=${encodeURIComponent(videoUrl)}`, {
        headers: this.headers
      });
      return {
        title: $(".content__title").text().trim() || "Tidak ada judul",
        videoId: $("player-component").attr("content-id") || "Tidak ada ID",
        videoUrl: videoUrl,
        studio: $(".studio-room-info__title--videoPage span").text().trim() || "Tidak ada studio",
        studioUrl: $(".studio-room-info__title--videoPage").attr("href") || "Tidak ada link studio",
        totalVideos: $(".studio-room-info__text--videoPage").text().trim() || "0 video",
        likePercentage: $(".content-actions__info").first().text().trim() || "0%",
        dislikePercentage: $(".content-actions__info").eq(1).text().trim() || "0%",
        views: $(".content-actions__info").last().text().trim() || "0 views",
        model: $(".content-info__link").text().trim() || "Tidak ada model",
        modelUrl: $(".content-info__link").attr("href") || "Tidak ada link model",
        media: media
      };
    } catch (error) {
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new Downloader();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await downloader.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await downloader.detail(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}