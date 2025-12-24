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
      const link = encodeURIComponent(`https://bokepsin.com/?s=${query}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const results = [];
      $(".video-block").each((_, el) => {
        const title = $(el).find(".title").text().trim();
        const views = $(el).find(".views-number").text().trim();
        const duration = $(el).find(".duration").text().trim();
        const videoUrl = $(el).find("a.thumb").attr("href");
        const thumbnail = $(el).find(".video-img").attr("data-src");
        results.push({
          title: title,
          views: views,
          duration: duration,
          videoUrl: videoUrl,
          thumbnail: thumbnail
        });
      });
      return results;
    } catch (error) {
      console.error("Error in search:", error.message || error);
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
      const videoDetails = {
        title: $('meta[itemprop="name"]').attr("content"),
        description: $('meta[itemprop="description"]').attr("content"),
        duration: this.formatDuration($('meta[itemprop="duration"]').attr("content")),
        thumbnailUrl: $('meta[itemprop="thumbnailUrl"]').attr("content"),
        uploadDate: $('meta[itemprop="uploadDate"]').attr("content"),
        embedUrl: []
      };
      $("a").each((index, el) => {
        const onclickAttr = $(el).attr("onclick");
        if (onclickAttr) {
          const urlMatch = onclickAttr.match(/go\('([^']+)'\)/);
          if (urlMatch) {
            const url = urlMatch[1].startsWith("//") ? `https:${urlMatch[1]}` : `${urlMatch[1]}`;
            const title = $(el).text().trim() || `OnClick ${index + 1}`;
            videoDetails.embedUrl.push({
              title: title,
              url: url
            });
          }
        }
      });
      return videoDetails;
    } catch (error) {
      console.error("Error in detail:", error.message || error);
      return {
        status: false,
        error: error.message || error
      };
    }
  }
  formatDuration(duration) {
    const match = duration.match(/PT(\d+)H(\d+)M(\d+)S/);
    if (match) {
      const minutes = match[2].padStart(2, "0");
      const seconds = match[3].padStart(2, "0");
      return `${minutes}:${seconds}`;
    }
    return duration;
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