import axios from "axios";
class WebCloner {
  constructor() {
    this.url = "https://webcloner.aliret.com/clone";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://webcloner.online/"
    };
  }
  generateEmail() {
    return `user${Date.now()}@example.com`;
  }
  generateIpAddress() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 256)).join(".");
  }
  async cloneWebsite(url) {
    const data = {
      url: url,
      email: this.generateEmail(),
      ipAdress: this.generateIpAddress()
    };
    try {
      const {
        data: result
      } = await axios.post(this.url, data, {
        headers: this.headers
      });
      return {
        media: result[0] || "default_media_url",
        url: result[2] || "default_url"
      };
    } catch (error) {
      console.error("Error:", error);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new WebCloner();
    const result = await downloader.cloneWebsite(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}