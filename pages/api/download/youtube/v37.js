import axios from "axios";
import crypto from "crypto";
class VideoDownloader {
  constructor() {
    this.apiUrl = "https://api.zeemo.ai/hy-caption-front/api/v1/video-download/yt-dlp-video-info";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      "hycaption-area": "",
      "hycaption-lang": "id",
      origin: "https://zeemo.ai",
      priority: "u=1, i",
      referer: "https://zeemo.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "zeemo-web-version": "3.8.2",
      "zmh-tzint": "8"
    };
  }
  generateTempKeys() {
    const e = new Date().getTime();
    const t = "qiluomite_XYZ_654321^&";
    const a = e + t;
    const r = this.hashMd5(this.hashMd5(a) + t);
    return {
      tempKey: e,
      tempSecret: r
    };
  }
  hashMd5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }
  async downloadVideo(url) {
    const {
      tempKey,
      tempSecret
    } = this.generateTempKeys();
    const data = {
      url: url,
      videoSource: 3,
      action: 1,
      timestamp: tempKey,
      tempSecret: tempSecret
    };
    try {
      const response = await axios.post(this.apiUrl, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error downloading video:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No YouTube URL"
    });
    const downloader = new VideoDownloader();
    const result = await downloader.downloadVideo(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}