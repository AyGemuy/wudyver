import axios from "axios";
import {
  parse
} from "node-html-parser";
class TikTokDownloader {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://dtdownload.com/id/"
      }
    });
  }
  async generateDownloadLink(link) {
    try {
      const response = await this.client.post("/Generate", new URLSearchParams({
        link: link
      }));
      return response.data;
    } catch (error) {
      console.error("Error generating TikTok download link:", error.message);
      throw error.response?.data || error.message;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL tidak ditemukan. Pastikan URL TikTok sudah benar."
    });
  }
  const downloader = new TikTokDownloader("https://dtdownload.com");
  try {
    const result = await downloader.generateDownloadLink(url);
    return res.status(200).json({
      message: "Download link generated successfully",
      result: parse(result?.data)
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate download link",
      details: error
    });
  }
}