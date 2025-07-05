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
      const link = encodeURIComponent(`https://www.pornhub.com/video/search?search=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const videos = $("li[data-video-segment]").map((i, el) => {
        const $el = $(el);
        const link = $el.find(".title a").attr("href")?.trim();
        const title = $el.find(".title a").text().trim();
        const uploader = $el.find(".videoUploaderBlock a").text().trim();
        const views = $el.find(".views").text().trim();
        const duration = $el.find(".duration").text().trim();
        return link.includes("viewkey") ? {
          url: `https://www.pornhub.com${link}`,
          title: title,
          uploader: uploader,
          views: views,
          duration: duration
        } : null;
      }).get().filter(Boolean);
      return videos;
    } catch (error) {
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async detail(url) {
    try {
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const metaPayload = (() => {
        const startPattern = /var flashvars_\d{1,} = /;
        const startIndex = html.search(startPattern);
        if (startIndex === -1) return null;
        const endIndex = html.indexOf(";\n", startIndex);
        const jsonString = html.substring(html.indexOf("{", startIndex), endIndex);
        return JSON.parse(jsonString);
      })();
      return metaPayload || {};
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