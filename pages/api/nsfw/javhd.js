import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/50 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search(query) {
    try {
      const link = encodeURIComponent(`https://javhd.com/en/search?q=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      return $("div.thumb-wrapper").map((_, el) => {
        const titleElement = $(el).find(".thumb__title");
        const linkElement = $(el).find(".thumb__link");
        const thumbnailElement = $(el).find(".thumb__img");
        const viewsElement = $(el).find(".thumb__statistics-item--views");
        const likesElement = $(el).find(".thumb__statistics-item--likes");
        const timeLabel = $(el).find(".thumb__label--time");
        return {
          title: titleElement.text().trim() || "Tidak ada judul",
          url: linkElement.attr("href") || "Tidak ada link",
          thumbnail: thumbnailElement.attr("data-src") || thumbnailElement.attr("src") || "Tidak ada thumbnail",
          duration: timeLabel.text().trim() || "Tidak ada durasi",
          views: viewsElement.text().replace(/\s/g, "").trim() || "0",
          likes: likesElement.text().replace(/\s/g, "").trim() || "0"
        };
      }).get();
    } catch (error) {
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async detail(url) {
    try {
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const videoElement = $("#javplayer_html5");
      const videoUrl = videoElement.attr("src") || videoElement.find("source").attr("src");
      const videoIdMatch = url.match(/\/id\/(\d+)\//);
      const videoId = videoIdMatch && videoIdMatch[1] ? videoIdMatch[1] : "Tidak ada ID";
      return {
        title: $(".content__title").text().trim() || "Tidak ada judul",
        videoId: videoId,
        videoUrl: videoUrl || "Tidak ada URL video",
        studio: $(".studio-room-info__title--videoPage span").text().trim() || "Tidak ada studio",
        studioUrl: $(".studio-room-info__title--videoPage").attr("href") || "Tidak ada link studio",
        totalVideos: $(".studio-room-info__text--videoPage").text().trim() || "0 video",
        likePercentage: $(".content-actions__btn--like + .content-actions__info").text().trim() || "0%",
        dislikePercentage: $(".content-actions__btn--dislike + .content-actions__info").text().trim() || "0%",
        views: $(".content-actions__item--info .content-actions__info").last().text().trim() || "0 views",
        description: $(".content__desc").text().trim() || "Tidak ada deskripsi",
        model: $(".content-info__link").text().trim() || "Tidak ada model",
        modelUrl: $(".content-info__link").attr("href") || "Tidak ada link model"
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