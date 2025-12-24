import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
class AllInOneDownloader {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://allinonedownloader.com"
    });
    this.cookies = {};
    this.key = null;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://allinonedownloader.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://allinonedownloader.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.axiosInstance.interceptors.request.use(config => {
      const cookies = this.getCookies();
      if (cookies) {
        config.headers.Cookie = cookies;
      }
      return config;
    });
    this.axiosInstance.interceptors.response.use(response => {
      this.setCookies(response.headers["set-cookie"]);
      return response;
    });
  }
  getCookies() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  setCookies(cookiesArray) {
    if (cookiesArray) {
      cookiesArray.forEach(cookie => {
        const parts = cookie.split(";")[0].split("=");
        if (parts.length === 2) {
          this.cookies[parts[0]] = parts[1];
        }
      });
    }
  }
  async download({
    url: urlToDownload
  }) {
    try {
      const mainPageResponse = await this.axiosInstance.get("/");
      const $ = cheerio.load(mainPageResponse.data);
      const endpoint = $("#scc").val();
      const token = $("#token").val();
      if (!endpoint || !token) {
        console.error("Endpoint atau token tidak ditemukan.");
        return null;
      }
      this.key = CryptoJS.enc.Hex.parse(token);
      const iv = CryptoJS.enc.Hex.parse("afc4e290725a3bf0ac4d3ff826c43c10");
      const encrypted = CryptoJS.AES.encrypt(urlToDownload, this.key, {
        iv: iv,
        padding: CryptoJS.pad.ZeroPadding
      });
      const urlhash = encrypted.toString();
      const postData = new URLSearchParams();
      postData.append("url", urlToDownload);
      postData.append("token", token);
      postData.append("urlhash", urlhash);
      const response = await this.axiosInstance.post(endpoint, postData.toString(), {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      return null;
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
    const downloader = new AllInOneDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}