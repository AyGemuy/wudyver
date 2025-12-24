import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class RednoteDownloader {
  constructor() {
    this.baseURL = "https://anydownloader.com";
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    this.axiosInstance.interceptors.request.use(config => {
      const spoofedHeaders = this.buildHeaders(config.headers);
      config.headers = {
        ...config.headers,
        ...spoofedHeaders
      };
      return config;
    }, error => {
      return Promise.reject(error);
    });
    this.defaultHeaders = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7,as;q=0.6",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Dnt: "1",
      "Sec-Ch-Ua": `"Not-A.Brand";v="99", "Chromium";v="124"`,
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": `"Android"`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    };
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    return {
      origin: this.baseURL,
      referer: `${this.baseURL}/en/xiaohongshu-videos-and-photos-downloader`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "x-request-id": this.randomID(8),
      "X-Requested-With": "XMLHttpRequest",
      ...SpoofHead(),
      ...extra
    };
  }
  async getToken() {
    try {
      const response = await this.axiosInstance.get(`${this.baseURL}/en/xiaohongshu-videos-and-photos-downloader`, {
        headers: this.defaultHeaders
      });
      const $ = cheerio.load(response.data);
      const token = $("#token").val();
      return {
        token: token
      };
    } catch (error) {
      console.error("Error getting token:", error.message);
      return null;
    }
  }
  calculateHash(url, salt) {
    return btoa(url) + (url.length + 1e3) + btoa(salt);
  }
  async download({
    url
  }) {
    const conf = await this.getToken();
    if (!conf) {
      return {
        error: "Failed to get token from web.",
        result: {},
        rawJson: null
      };
    }
    const {
      token
    } = conf;
    const hash = this.calculateHash(url, "aio-dl");
    const data = new URLSearchParams();
    data.append("url", url);
    data.append("token", token);
    data.append("hash", hash);
    try {
      const response = await this.axiosInstance.post(`${this.baseURL}/wp-json/aio-dl/video-data/`, data.toString(), {
        headers: this.defaultHeaders
      });
      const json = response.data;
      return json;
    } catch (error) {
      console.error("Error during download:", error.message);
      return {
        error: `An error occurred during the request: ${error.message}`,
        result: {},
        rawJson: null
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new RednoteDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}