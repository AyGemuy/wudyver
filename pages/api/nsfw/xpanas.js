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
      const link = encodeURIComponent(`https://x18.xpanas.wiki/?id=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      let results = [];
      $(".thumb-block").each((index, element) => {
        const videoLink = $(element).find("a").eq(1).attr("href");
        const title = $(element).find("a").eq(1).text().trim();
        const imageUrl = $(element).find("img").attr("data-src");
        const duration = $(element).find("span.duration").text().trim();
        if (videoLink) {
          results.push({
            title: title,
            url: `https://x18.xpanas.wiki${videoLink}`,
            image: imageUrl,
            duration: duration
          });
        }
      });
      return {
        status: true,
        data: results
      };
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
      let videoDetails = {};
      const title = $("title").text().trim();
      const description = $('meta[name="description"]').attr("content") || "";
      const iframeSrc = $("iframe[src]").attr("src");
      const downloadLink = $("a.btn-primary").attr("href");
      let socialLinks = {};
      $(".socialicon li a").each((index, element) => {
        const platform = $(element).parent().attr("class").replace("facebook", "Facebook").replace("twitter", "Twitter").replace("whatsapp", "WhatsApp").replace("line", "Line");
        const link = $(element).attr("href");
        socialLinks[platform] = link;
      });
      videoDetails = {
        title: title,
        description: description,
        iframeSrc: iframeSrc,
        downloadLink: downloadLink,
        socialLinks: socialLinks
      };
      return {
        status: true,
        data: videoDetails
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