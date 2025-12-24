import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Downloader {
  constructor() {
    this.baseUrl = "https://postsyncer.com";
    this.toolUrl = `${this.baseUrl}/tools/threads-video-downloader`;
    this.apiUrl = `${this.baseUrl}/api/social-media-downloader`;
    const cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      timeout: 3e4
    }));
    this.baseHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      origin: this.baseUrl,
      referer: this.toolUrl,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async getCsrfToken() {
    try {
      console.log("🔍 Mengambil sesi cookie dan CSRF token...");
      const response = await this.client.get(this.toolUrl, {
        headers: this.baseHeaders
      });
      const $ = cheerio.load(response.data);
      const csrfToken = $('meta[name="csrf-token"]').attr("content");
      if (!csrfToken) {
        throw new Error("Gagal menemukan meta tag CSRF token di halaman.");
      }
      console.log(`🔑 CSRF Token ditemukan: ${csrfToken.substring(0, 15)}...`);
      return csrfToken;
    } catch (error) {
      console.error("💥 Gagal mendapatkan CSRF token:", error.message);
      return null;
    }
  }
  async download({
    url: threadsUrl
  }) {
    try {
      const csrfToken = await this.getCsrfToken();
      if (!csrfToken) {
        throw new Error("Proses dibatalkan karena gagal mendapatkan CSRF token.");
      }
      const payload = {
        url: threadsUrl,
        platform: "threads"
      };
      const apiHeaders = {
        ...this.baseHeaders,
        "content-type": "application/json",
        "x-csrf-token": csrfToken
      };
      console.log(`🚀 Mengirim permintaan POST ke API untuk: ${threadsUrl}`);
      const response = await this.client.post(this.apiUrl, payload, {
        headers: apiHeaders
      });
      console.log("✅ Permintaan API berhasil, data diterima.");
      return response.data;
    } catch (error) {
      console.error("💥 Terjadi kesalahan pada proses download:", error.message);
      if (error.response) {
        console.error("Detail Error API:", error.response.status, error.response.data);
      }
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
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}