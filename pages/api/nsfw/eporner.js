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
      const link = encodeURIComponent(`https://www.eporner.com/search?q=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      return $("#vidresults .mb").map((index, el) => ({
        id: $(el).data("id") || "ID not available",
        quality: $(el).find(".mvhdico span").text() || "Quality not available",
        title: $(el).find(".mbtit a").text() || "Title not available",
        duration: $(el).find(".mbtim").text() || "Duration not available",
        rating: $(el).find(".mbrate").text() || "Rating not available",
        views: $(el).find(".mbvie").text() || "Views not available",
        uploader: $(el).find(".mb-uploader a").text() || "Uploader not available",
        url: new URL($(el).find(".mbtit a").attr("href"), "https://www.eporner.com").href || "Link not available",
        thumbnail: $(el).find(".mbimg img").attr("src") || "Thumbnail not available"
      })).get();
    } catch (error) {
      console.error("Error fetching data:", error.message || error);
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
      let title = $('meta[property="og:title"]').attr("content") || "Meta Title Not Found",
        description = $('meta[property="og:description"]').attr("content") || "Meta Description Not Found",
        thumbnail = $('meta[property="og:image"]').attr("content") || "Thumbnail Not Found";
      return {
        title: title,
        description: description,
        thumbnail: thumbnail,
        download: $(".dloaddivcol .download-h264 a").map((idx, downloadEl) => {
          const qualityMatch = $(downloadEl).text().match(/\d+p/),
            fileSizeMatch = $(downloadEl).text().match(/\d+\.\d+\s*MB/),
            downloadURL = new URL($(downloadEl).attr("href"), url);
          return {
            quality: qualityMatch ? qualityMatch[0] : "Quality Not Found",
            url: downloadURL.href,
            info: $(downloadEl).text().trim(),
            size: fileSizeMatch ? fileSizeMatch[0] : "Size Not Found"
          };
        }).get()
      };
    } catch (error) {
      console.error("Error fetching data:", error.message || error);
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