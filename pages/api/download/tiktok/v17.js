import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class TikTokDownloader {
  constructor() {
    this.baseUrl = "https://tikinsaver.com";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.lang = "id";
    this.cookies = new Map();
    this.axiosInstance = axios.create();
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
          const parsedCookie = cookie.split(";")[0];
          const [name, value] = parsedCookie.split("=");
          this.cookies.set(name, value);
        });
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.request.use(config => {
      if (this.cookies.size > 0) {
        const cookieString = Array.from(this.cookies.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
        config.headers["Cookie"] = cookieString;
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
  }
  async init() {
    try {
      console.log("🚀 Starting TikTok download process...");
      console.log("--- Initializing TikTok Downloader ---");
      console.log("Fetching fresh CSRF token and cookies...");
      const response = await this.axiosInstance.get(`${this.baseUrl}/${this.lang}`, {
        headers: {
          "User-Agent": this.userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": '"Android"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1"
        }
      });
      const $ = cheerio.load(response.data);
      const pageCSRF = $('meta[name="csrf-token"]').attr("content");
      const pageSeed = $('meta[name="challenge-seed"]').attr("content");
      if (!pageCSRF) {
        throw new Error("CSRF token not found on page");
      }
      this.csrf = pageCSRF;
      this.seed = pageSeed || "";
      console.log("✅ Fresh CSRF token and cookies retrieved");
      console.log("--- Initial Data Retrieved ---");
      console.log("CSRF Token:", this.csrf);
      console.log("Challenge Seed:", this.seed || "N/A");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize:", error.message);
      throw error;
    }
  }
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hexHash;
  }
  async generateChallenge(seed) {
    if (!seed) {
      return {
        hash: "",
        timestamp: Date.now()
      };
    }
    const now = Date.now();
    const rawString = `${seed}:${now}:${this.userAgent}`;
    const hashedValue = await this.sha256(rawString);
    console.log("\n--- Challenge Data Generated ---");
    console.log("Raw String for Hash:", rawString);
    console.log("Generated X-JS-Challenge-Hash:", hashedValue);
    console.log("Generated X-JS-Challenge-TS:", now);
    return {
      hash: hashedValue,
      timestamp: now
    };
  }
  validateUrl(url) {
    const validUrl = /https?:\/\/(?:www\.|vm\.|vt\.|t\.)?(tiktok|douyin)\.com\/[^\s]+/i.test(url);
    return validUrl;
  }
  async getToken(url) {
    try {
      const challengeData = await this.generateChallenge(this.seed);
      const headers = {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        Origin: "https://tikinsaver.com",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://tikinsaver.com/id",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": this.userAgent,
        "X-CSRF-TOKEN": this.csrf,
        "X-Requested-With": "XMLHttpRequest"
      };
      if (this.seed) {
        headers["X-JS-Challenge-Hash"] = challengeData.hash;
        headers["X-JS-Challenge-TS"] = challengeData.timestamp.toString();
      }
      const response = await this.axiosInstance.post(`${this.baseUrl}/api/get-token`, {
        url: url
      }, {
        headers: headers
      });
      if (response.status !== 200) {
        throw new Error(response.data?.message || `Failed to get security token. Status: ${response.status}`);
      }
      console.log("\n--- Security Token Data from Server ---");
      console.log("Server Response for Token:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(`Failed to get security token: ${errorMessage}`);
    }
  }
  async downloadVideo(url, tokenData) {
    const {
      timestamp,
      nonce,
      token,
      clientCode
    } = tokenData;
    console.log("\n--- Data Used for Download Request ---");
    console.log("Download Request Payload:", JSON.stringify({
      url: url,
      timestamp: timestamp,
      nonce: nonce,
      token: token
    }, null, 2));
    console.log("Download Request Headers (relevant):");
    console.log(`  X-CSRF-TOKEN: ${this.csrf}`);
    console.log(`  X-Client-Code: ${clientCode}`);
    try {
      const response = await this.axiosInstance.post(`${this.baseUrl}/${this.lang}/download`, {
        url: url,
        timestamp: timestamp,
        nonce: nonce,
        token: token
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          Origin: "https://tikinsaver.com",
          Pragma: "no-cache",
          Priority: "u=1, i",
          Referer: "https://tikinsaver.com/id",
          "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": '"Android"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": this.userAgent,
          "X-Client-Code": clientCode,
          "X-CSRF-TOKEN": this.csrf,
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      if (response.status !== 200) {
        throw new Error(response.data?.message || `Download failed. Status: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(`Download failed: ${errorMessage}`);
    }
  }
  async download({
    url
  }) {
    try {
      if (!this.validateUrl(url)) {
        throw new Error("Please provide a valid TikTok video URL.");
      }
      await this.init();
      const tokenData = await this.getToken(url);
      const downloadData = await this.downloadVideo(url, tokenData);
      return downloadData;
    } catch (error) {
      console.error("\n❌ Error during download:", error.message);
      throw error;
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
  try {
    const downloader = new TikTokDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}