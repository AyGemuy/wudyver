import axios from "axios";
import crypto from "crypto";
class InstaDownloader {
  constructor() {
    this.baseUrl = "https://insta.savetube.me/downloadPostVideo";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
  }
  generateToken() {
    const header = Buffer.from(JSON.stringify({
      alg: "HS256",
      typ: "JWT"
    })).toString("base64");
    const payload = Buffer.from(JSON.stringify({
      payload: "User",
      iat: Math.floor(Date.now() / 1e3),
      exp: Math.floor(Date.now() / 1e3) + 30
    })).toString("base64");
    const signature = crypto.createHmac("sha256", "", "").update(`${header}.${payload}`).digest("base64");
    return `${header}.${payload}.${signature}`;
  }
  async download(url) {
    try {
      const token = this.generateToken();
      const response = await axios.post(`${this.baseUrl}?token=${token}`, {
        url: url
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Access-Control-Allow-Origin": "*",
          Connection: "keep-alive",
          "Content-Type": "application/json",
          Origin: "https://insta.savetube.me",
          Referer: "https://insta.savetube.me/video-download",
          "User-Agent": this.userAgent,
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error downloading:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const downloader = new InstaDownloader();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}