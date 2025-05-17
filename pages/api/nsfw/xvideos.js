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
      const link = encodeURIComponent(`https://www.xvideos.com/?k=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const data = $("#content .frame-block").map((_, el) => ({
        id: $(el).attr("data-id") || "N/A",
        title: $(el).find(".thumb-under .title a").attr("title") || "N/A",
        duration: $(el).find(".thumb-under .duration").text().trim().split(" ")[0] || "N/A",
        url: "https://www.xvideos.com" + $(el).find(".thumb a").attr("href") || "N/A",
        thumb: $(el).find(".thumb img").attr("src") || "N/A"
      })).get();
      const pagination = $(".pagination a").map((_, el) => ({
        page: $(el).text().trim(),
        pageUrl: $(el).attr("href")
      })).get();
      return {
        data: data,
        page: pagination.length
      };
    } catch (error) {
      return [{
        error: error.message || "Terjadi kesalahan"
      }];
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
      const scriptTags = $("script");
      let videoUrlLow, videoUrlHigh, videoHLS;
      scriptTags.each((_, el) => {
        const scriptContent = $(el).html();
        videoUrlLow = videoUrlLow || scriptContent.match(/setVideoUrlLow\(['"]([^'"]+)['"]\)/)?.[1];
        videoUrlHigh = videoUrlHigh || scriptContent.match(/setVideoUrlHigh\(['"]([^'"]+)['"]\)/)?.[1];
        videoHLS = videoHLS || scriptContent.match(/setVideoHLS\(['"]([^'"]+)['"]\)/)?.[1];
      });
      const title = $("h2.page-title").text().trim() || "N/A";
      const duration = $("span.duration").text().trim().split(" ")[0] || "0";
      const uploaderName = $(".main-uploader .name").text().trim() || "Unknown";
      const uploaderProfileLink = $(".main-uploader a").attr("href") || "#";
      const uploaderFollowers = $(".main-uploader .count").text().trim() || "0";
      const tags = $(".video-tags-list .is-keyword").map((_, el) => $(el).text().trim()).get();
      const thumbnailUrl = $(".video-pic img").attr("src") || "";
      return {
        title: title,
        duration: duration,
        uploader: {
          name: uploaderName,
          link: uploaderProfileLink,
          followers: uploaderFollowers
        },
        tags: tags,
        low: videoUrlLow,
        high: videoUrlHigh,
        hls: videoHLS,
        thumb: thumbnailUrl
      };
    } catch (error) {
      return {
        error: error.message || "Terjadi kesalahan"
      };
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