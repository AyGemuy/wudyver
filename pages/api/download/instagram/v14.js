import axios from "axios";
class InstagramReelsDownloader {
  constructor() {
    this.baseUrl = "https://reelsdownloader.socialplug.io/api/instagram_reels_downloader";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.socialplug.io/free-tools/instagram-reels-downloader"
    };
  }
  async downloadReels(url) {
    try {
      const data = {
        url: url
      };
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers
      });
      if (response.data) {
        return response.data;
      } else {
        throw new Error("No download URL found");
      }
    } catch (error) {
      console.error("Error downloading Instagram Reel:", error);
      throw new Error("Failed to download Instagram Reel");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Invalid Instagram Reel URL"
    });
  }
  try {
    const instagramReelsDownloader = new InstagramReelsDownloader();
    const downloadUrl = await instagramReelsDownloader.downloadReels(url);
    return res.status(200).json({
      result: downloadUrl
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}