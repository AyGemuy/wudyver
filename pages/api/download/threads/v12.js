import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class Downloader {
  constructor() {
    this.baseUrl = "https://threadsdownload.net/id";
    const cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      timeout: 3e4
    }));
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://threadsdownload.net",
      referer: "https://threadsdownload.net/id",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async initializeSession() {
    try {
      console.log("🔍 Menginisialisasi sesi dan mengambil cookie...");
      await this.client.get(this.baseUrl, {
        headers: this.baseHeaders
      });
      console.log("✅ Sesi berhasil diinisialisasi.");
      return true;
    } catch (error) {
      console.error("💥 Gagal saat menginisialisasi sesi:", error.message);
      return false;
    }
  }
  _parseHtmlResponse(html) {
    try {
      const $ = cheerio.load(html);
      const userSection = $('section[data-id="__0"]');
      if (!userSection.length) {
        throw new Error("Struktur HTML tidak valid, bagian user tidak ditemukan.");
      }
      const username = userSection.find("p.flex.grow").text().trim();
      const profilePic = userSection.find("img").attr("src");
      const caption = userSection.find("p.text-xs").text().trim();
      const media = [];
      $('section[data-id^="__"]').slice(1).each((i, el) => {
        const mediaSection = $(el);
        const thumbnail = mediaSection.find("img").attr("src");
        const downloadUrl = mediaSection.find("a.download_link").attr("href");
        if (downloadUrl) {
          let directMediaUrl = null;
          let fileType = "unknown";
          try {
            const base64Part = downloadUrl.split("/").pop();
            if (base64Part) {
              directMediaUrl = Buffer.from(base64Part, "base64").toString("utf8");
              fileType = directMediaUrl.includes(".mp4") ? "video" : "photo";
            }
          } catch (decodeError) {
            console.warn("Gagal men-decode URL, tipe file ditentukan dari URL asli:", decodeError.message);
            fileType = downloadUrl.includes(".mp4") ? "video" : "photo";
          }
          media.push({
            type: fileType,
            thumbnail: thumbnail,
            downloadUrl: downloadUrl,
            directMediaUrl: directMediaUrl
          });
        }
      });
      return {
        success: true,
        user: {
          username: username,
          profilePic: profilePic
        },
        caption: caption,
        media: media
      };
    } catch (error) {
      console.error("💥 Gagal mem-parsing respons HTML:", error.message);
      return {
        success: false,
        error: "Gagal mem-parsing HTML hasil.",
        errorDetails: error.message
      };
    }
  }
  async download({
    url: threadsUrl
  }) {
    const sessionReady = await this.initializeSession();
    if (!sessionReady) {
      return {
        success: false,
        error: "Gagal memulai sesi."
      };
    }
    const form = new FormData();
    form.append("search", threadsUrl);
    const requestHeaders = {
      ...this.baseHeaders,
      ...form.getHeaders()
    };
    try {
      console.log(`🚀 Mengirim permintaan POST untuk: ${threadsUrl}`);
      const response = await this.client.post(`${this.baseUrl}?fresh-partial=true`, form, {
        headers: requestHeaders
      });
      if (!response.data) {
        throw new Error("Respons dari server kosong.");
      }
      console.log("✅ Respons HTML diterima, memulai parsing...");
      return this._parseHtmlResponse(response.data);
    } catch (error) {
      console.error("💥 Terjadi kesalahan pada proses download:", error.message);
      if (error.response) {
        console.error("Detail Error API:", error.response.status, error.response.data);
      }
      return {
        success: false,
        error: "Permintaan ke API gagal.",
        errorDetails: error.message
      };
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