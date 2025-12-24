import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const cookieJar = new CookieJar();
const client = wrapper(axios.create({
  jar: cookieJar,
  withCredentials: true
}));
class Downloader {
  constructor() {
    this.baseUrl = "https://threadster.app";
    this.maxRetries = 3;
    this.timeout = 3e4;
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: this.baseUrl,
      pragma: "no-cache",
      priority: "u=0, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url,
    retryCount = 0
  }) {
    try {
      console.log(`🔍 Memulai proses untuk: ${url} (percobaan ${retryCount + 1})`);
      await this.initializeSession();
      console.log("🍪 Sesi dan cookie dari halaman utama telah diinisialisasi.");
      const formData = new URLSearchParams();
      formData.append("url", url);
      const response = await client.post(`${this.baseUrl}/download`, formData.toString(), {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          referer: this.baseUrl + "/"
        },
        timeout: this.timeout,
        maxRedirects: 5
      });
      console.log("✅ Respons dari Threadster diterima.");
      if (!response.data) {
        throw new Error("Tidak ada data yang diterima dari Threadster");
      }
      const result = this.parseThreadsterResponse(response.data);
      if (result.success) {
        console.log("✅ Berhasil mem-parsing data.");
        return result;
      } else {
        throw new Error(result.error || "Gagal mem-parsing respons Threadster.");
      }
    } catch (error) {
      console.error(`💥 Terjadi error (percobaan ${retryCount + 1}):`, error.message);
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        console.log(`🔄 Mencoba lagi... (${retryCount + 1}/${this.maxRetries})`);
        await this.delay(2e3 * (retryCount + 1));
        return this.download({
          url: url,
          retryCount: retryCount + 1
        });
      }
      return {
        success: false,
        error: "Proses unduhan gagal setelah beberapa kali percobaan.",
        errorDetails: {
          message: error.message,
          code: error.code,
          url: url,
          attempts: retryCount + 1
        }
      };
    }
  }
  async initializeSession() {
    try {
      await client.get(this.baseUrl + "/", {
        headers: this.headers
      });
    } catch (error) {
      console.error("💥 Gagal saat inisialisasi sesi:", error.message);
      throw new Error("Gagal menginisialisasi sesi dengan server.");
    }
  }
  parseThreadsterResponse(html) {
    try {
      const $ = cheerio.load(html);
      const downloadSection = $(".download_result_section");
      if (downloadSection.length === 0) {
        const errorMessage = $(".error-message-container .error-message").text().trim();
        return {
          success: false,
          error: errorMessage || "Tidak ditemukan bagian unduhan."
        };
      }
      const userInfo = this.extractUserInfo($);
      const caption = this.extractCaption($);
      const downloads = this.extractDownloadLinks($);
      const videoInfo = this.extractVideoInfo($, downloads);
      return {
        success: true,
        user: userInfo,
        caption: caption,
        downloads: downloads,
        video: videoInfo
      };
    } catch (error) {
      console.error("💥 Error saat mem-parsing respons HTML:", error.message);
      return {
        success: false,
        error: "Gagal mem-parsing respons HTML."
      };
    }
  }
  extractUserInfo($) {
    const profilePic = $(".download__item__profile_pic img").attr("src");
    const username = $(".download__item__profile_pic span").text().trim();
    return {
      username: username || "Tidak Diketahui",
      profilePic: profilePic || null
    };
  }
  extractCaption($) {
    const captionText = $(".download__item__caption__text").text().trim();
    return {
      text: captionText,
      hasText: captionText.length > 0,
      length: captionText.length
    };
  }
  extractDownloadLinks($) {
    const downloads = [];
    $("table tbody tr").each((index, element) => {
      if (index === 0) return;
      const $row = $(element);
      const resolution = $row.find("td:first-child").text().trim();
      const downloadLink = $row.find("a").attr("href");
      if (downloadLink) {
        downloads.push({
          resolution: resolution || "Terbaik",
          url: downloadLink
        });
      }
    });
    return downloads;
  }
  extractVideoInfo($, downloadLinks) {
    const bestQuality = downloadLinks.find(dl => dl.resolution === "Terbaik") || downloadLinks[0];
    if (!bestQuality) return null;
    return {
      bestQuality: bestQuality.resolution,
      downloadUrl: bestQuality.url,
      totalOptions: downloadLinks.length
    };
  }
  isRetryableError(error) {
    return !error.response || error.response.status >= 500 || ["ECONNABORTED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(error.code) || error.message.includes("timeout");
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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