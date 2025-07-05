import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.baseUrl = "https://10downloader.com/download";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=0, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url
  }) {
    if (!url) return null;
    try {
      const response = await axios.get(`${this.baseUrl}?v=${encodeURIComponent(url)}&lang=en&type=video`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const title = $(".info .title").text().trim() || "Unknown Title";
      const duration = $(".info .duration").text().replace("Duration:", "").trim() || "Unknown Duration";
      const thumbnail = $(".info img").attr("src") || "";
      const downloads = $(".downloadsTable tbody tr").map((i, el) => {
        const [quality, format, size] = $(el).find("td").map((_, td) => $(td).text().trim()).get();
        const link = $(el).find("td a.downloadBtn").attr("href") || "";
        return quality && format && link ? {
          quality: quality,
          format: format,
          size: size,
          link: link
        } : null;
      }).get();
      return {
        title: title,
        duration: duration,
        image: thumbnail,
        download: downloads
      };
    } catch (error) {
      console.error("Download error:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new Downloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}