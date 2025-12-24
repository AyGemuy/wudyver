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
    this.baseUrl = "https://threadsv.com";
    this.apiUrl = `${this.baseUrl}/get-thr`;
    const cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      timeout: 3e4
    }));
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https.threadsv.com",
      referer: "https.threadsv.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v-="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async getFormToken() {
    try {
      console.log("🔍 Mengambil sesi cookie dan token formulir...");
      const response = await this.client.get(this.baseUrl, {
        headers: this.baseHeaders
      });
      const $ = cheerio.load(response.data);
      const token = $("#token").val();
      if (!token) {
        throw new Error("Gagal menemukan token formulir di halaman utama.");
      }
      console.log(`🔑 Token formulir ditemukan: ${token}`);
      return token;
    } catch (error) {
      console.error("💥 Gagal mendapatkan token formulir:", error.message);
      return null;
    }
  }
  _parseApiResponseHtml(html) {
    try {
      const $ = cheerio.load(html);
      const media = [];
      $(".item").each((i, el) => {
        const item = $(el);
        const thumbnail = item.find(".thumb img").attr("src");
        const downloadBtnHref = item.find("a.download-btn").attr("href");
        const quality = item.find("span.tag.HD").text().trim();
        if (downloadBtnHref) {
          let fileType = "unknown";
          let directMediaUrl = null;
          try {
            const urlParams = new URL(downloadBtnHref).searchParams;
            const token = urlParams.get("token");
            if (token) {
              const payloadBase64 = token.split(".")[1];
              if (payloadBase64) {
                const decodedPayload = Buffer.from(payloadBase64, "base64").toString("utf8");
                const payloadJson = JSON.parse(decodedPayload);
                if (payloadJson.data && payloadJson.data.url) {
                  directMediaUrl = payloadJson.data.url;
                  fileType = payloadJson.data.ext || (directMediaUrl.includes(".mp4") ? "video" : "photo");
                }
              }
            }
          } catch (jwtError) {
            console.warn("Gagal men-decode JWT. Tipe file akan ditentukan dari URL.");
            fileType = downloadBtnHref.includes(".mp4") ? "video" : "photo";
          }
          media.push({
            type: fileType,
            thumbnail: thumbnail,
            downloadUrl: downloadBtnHref,
            directMediaUrl: directMediaUrl,
            quality: quality || "Standard"
          });
        }
      });
      return {
        success: true,
        media: media
      };
    } catch (error) {
      console.error("💥 Gagal mem-parsing HTML dari respons API:", error.message);
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
    const token = await this.getFormToken();
    if (!token) {
      return {
        success: false,
        error: "Proses dibatalkan karena gagal mendapatkan token."
      };
    }
    const payload = {
      token: token,
      url: threadsUrl,
      lang: "en"
    };
    const apiHeaders = {
      ...this.baseHeaders,
      "content-type": "application/json; charset=UTF-8"
    };
    try {
      console.log(`🚀 Mengirim permintaan POST ke API untuk: ${threadsUrl}`);
      const response = await this.client.post(this.apiUrl, payload, {
        headers: apiHeaders
      });
      const data = response.data;
      if (data.error || !data.html) {
        throw new Error(data.message || "API mengembalikan error atau tidak ada data HTML.");
      }
      console.log("✅ Respons JSON diterima, memulai parsing HTML...");
      return this._parseApiResponseHtml(data.html);
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