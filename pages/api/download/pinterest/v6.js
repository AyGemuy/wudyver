import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  FormData
} from "formdata-node";
class SnapInstaExtractor {
  constructor() {
    this.baseUrl = "https://snap-insta.app";
    this.videoDataUrl = `${this.baseUrl}/wp-json/aio-dl/video-data/`;
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getToken() {
    try {
      console.log("[INFO] Fetching token...");
      const {
        data
      } = await this.client.get(this.baseUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const token = $("#token").val();
      console.log("[INFO] Token:", token);
      return token || null;
    } catch (err) {
      console.error("[ERROR] Failed to fetch token:", err.message);
      return null;
    }
  }
  async getRedirect(url) {
    try {
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      return response.headers.location || url;
    } catch (error) {
      return error.response?.headers?.location || url;
    }
  }
  async fetch(inputUrl) {
    const videoUrl = await this.getRedirect(inputUrl);
    const token = await this.getToken();
    if (!token) return null;
    try {
      console.log("[INFO] Requesting video data...");
      const formData = new FormData();
      formData.append("url", videoUrl);
      formData.append("token", token);
      const {
        data
      } = await this.client.post(this.videoDataUrl, formData, {
        headers: {
          ...this.headers,
          ...formData.headers
        }
      });
      console.log("[INFO] Response received:", data);
      return data;
    } catch (err) {
      console.error("[ERROR] Failed to fetch video data:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const extractor = new SnapInstaExtractor();
  try {
    const data = await extractor.fetch(params.url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}