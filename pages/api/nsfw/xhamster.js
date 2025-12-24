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
      const link = encodeURIComponent(`https://id.xhamster.com/search/${encodeURIComponent(query)}?q=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const results = [];
      $(".thumb-list__item.video-thumb").each((i, el) => {
        const title = $(el).find(".video-thumb-info__name").text().trim() || "Tidak ada judul";
        const url = $(el).find(".video-thumb__image-container").attr("href") || "Tidak ada URL";
        const thumbnail = $(el).find(".thumb-image-container__image").attr("src") || "Tidak ada thumbnail";
        const duration = $(el).find(".thumb-image-container__duration .tiny-8643e").text().trim() || "Durasi tidak diketahui";
        const uploader = $(el).find(".video-uploader-data a").text().trim() || "Anonim";
        if (title && url) results.push({
          title: title,
          url: url,
          thumbnail: thumbnail,
          duration: duration,
          uploader: uploader
        });
      });
      return results.length ? results : [{
        message: "Tidak ada hasil ditemukan"
      }];
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
      const title = $('div[data-role="video-title"] h1.title-f2600').text().trim() || "Tidak ada judul";
      const stats = $('div[data-role="video-title"] p.primary-8643e.icons-a993a span.primary-8643e');
      const viewCount = stats.eq(0).text().trim() || "Tidak diketahui";
      const likePercentage = stats.eq(1).text().trim() || "Tidak diketahui";
      const uploaderAnchor = $('nav#video-tags-list-container a[href*="/creators/"]').first();
      const uploader = uploaderAnchor.length ? {
        name: uploaderAnchor.find("span.body-bold-8643e.label-5984a").text().trim() || "Tidak diketahui",
        url: uploaderAnchor.attr("href") || "Tidak ada URL",
        avatar: uploaderAnchor.find("img.image-9a750").attr("src") || "Tidak ada avatar",
        subscribers: uploaderAnchor.find("span.sub-button__counter").text().trim() || "0"
      } : null;
      const tags = [];
      $("nav#video-tags-list-container a").each((i, el) => {
        const href = $(el).attr("href") || "";
        if (!href.includes("/creators/")) {
          const tag = $(el).find("span.body-8643e.label-5984a.label-96c3e").text().trim() || "Tidak ada tag";
          if (tag && tag !== "Tidak ada tag") tags.push(tag);
        }
      });
      let videoUrl = "";
      const noscriptContent = $("noscript").html() || "";
      const match = noscriptContent.match(/<video[^>]+src=['"]([^'"]+)['"]/);
      videoUrl = match ? match[1] : "";
      if (!videoUrl) {
        videoUrl = $("a.player-container__no-player").attr("href") || "Tidak ada link video";
      }
      const preloadDiv = $("div.player-container div.xp-preload-image");
      const styleAttr = preloadDiv.attr("style") || "";
      const matchThumb = styleAttr.match(/url\(['"]?(.*?)['"]?\)/);
      const thumbnail = matchThumb ? matchThumb[1] : "Tidak ada thumbnail";
      return {
        title: title,
        viewCount: viewCount,
        likePercentage: likePercentage,
        uploader: uploader,
        tags: tags,
        videoUrl: videoUrl,
        thumbnail: thumbnail
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