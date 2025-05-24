import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.baseUrl = "https://www.klickaud.org";
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "max-age=0",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: this.baseUrl,
      Priority: "u=0, i",
      Referer: this.baseUrl + "/",
      "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "Sec-CH-UA-Mobile": "?1",
      "Sec-CH-UA-Platform": '"Android"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getCsrfToken() {
    try {
      const response = await this.client.get(`${this.baseUrl}/csrf-token-endpoint.php`, {
        headers: this.headers
      });
      return response.data.csrf_token;
    } catch (error) {
      throw new Error("Gagal mengambil CSRF Token: " + error.message);
    }
  }
  async downloadTrack(url) {
    try {
      const csrf_token = await this.getCsrfToken();
      const formData = new URLSearchParams();
      formData.append("value", url);
      formData.append("csrf_token", csrf_token);
      const response = await this.client.post(`${this.baseUrl}/download.php`, formData, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const tracks = $("table tbody tr.mobtable2").map((_, el) => ({
        avatar: $(el).find("td:nth-child(1) img").attr("src") || "",
        title: $(el).find("td:nth-child(2)").text().trim() || "Unknown",
        bitrate: $(el).find("td:nth-child(3)").text().trim() || "Unknown",
        quality: $(el).find("td:nth-child(4) span").attr("class") || "Unknown"
      })).get().pop();
      return {
        ...tracks,
        downloadUrl: $("table tbody tr.mobile-grid a").attr("href") || ""
      };
    } catch (error) {
      throw new Error("Gagal mengunduh: " + error.message);
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
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}