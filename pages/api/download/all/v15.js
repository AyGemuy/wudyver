import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TikTokDownloader {
  constructor() {
    this.baseUrl = "https://alldownloader.app";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
  }
  async fetchToken() {
    try {
      const {
        data,
        headers
      } = await this.client.get(this.baseUrl);
      const $ = cheerio.load(data);
      return {
        token: $('meta[name="csrf-token"]').attr("content") || "",
        cookies: headers["set-cookie"] || []
      };
    } catch (error) {
      throw new Error("Gagal mengambil token: " + error.message);
    }
  }
  extractDownloadLinks(html) {
    const $ = cheerio.load(html);
    return {
      thumbnail: $(".position-relative > img").attr("src") || "",
      duration: $(".time-badge").text().trim() || "",
      title: $(".border-bottom > h4").text().trim() || "",
      media: $(".row > .col-lg-6.col-12").map((_, el) => {
        const [format, ...res] = $(el).find("p").text().trim().replace(/Download$/, "").trim().split(" ");
        const url = $(el).find("a").attr("href");
        return format && url ? {
          format: format,
          resolution: res.join(" "),
          url: url
        } : null;
      }).get().filter((v, i, arr) => arr.every((x, j) => j >= i || x.url !== v.url))
    };
  }
  async download(url) {
    try {
      const {
        token,
        cookies
      } = await this.fetchToken();
      if (!token) throw new Error("Token tidak ditemukan");
      const form = new URLSearchParams({
        _token: token,
        link: url
      });
      const headers = {
        Cookie: cookies.join("; "),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const response = await this.client.post("https://alldownloader.app/en/get-video", form.toString(), {
        headers: headers
      });
      if (!response.data?.data) throw new Error("Gagal mendapatkan data video");
      const videoData = await this.client.get(response.data.data);
      return this.extractDownloadLinks(videoData.data);
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new TikTokDownloader();
    const result = await downloader.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}