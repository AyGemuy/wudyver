import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
const cookieJar = new CookieJar();
const client = wrapper(axios.create({
  jar: cookieJar,
  withCredentials: true
}));
class Downloader {
  constructor() {
    this.baseUrl = "https://threadsmate.com";
    this.maxRetries = 3;
    this.timeout = 3e4;
    this.headers = {
      accept: "*/",
      "accept-language": "id-ID",
      origin: this.baseUrl,
      pragma: "no-cache",
      referer: `${this.baseUrl}/id`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url,
    retryCount = 0
  }) {
    try {
      console.log(`🔍 Memulai proses untuk: ${url} (percobaan ${retryCount + 1})`);
      const initialData = await this.getInitialData();
      if (!initialData || !initialData.tokenName || !initialData.tokenValue) {
        throw new Error("Gagal mendapatkan token formulir dari halaman utama.");
      }
      console.log(`🔑 Token ditemukan: { name: '${initialData.tokenName}', value: '${initialData.tokenValue.substring(0, 15)}...' }`);
      const formData = new FormData();
      formData.append("url", url);
      formData.append(initialData.tokenName, initialData.tokenValue);
      formData.append("lang", "id");
      const response = await client.post(`${this.baseUrl}/action`, formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders()
        },
        timeout: this.timeout
      });
      console.log("✅ Respons API diterima.");
      if (response.data.error || !response.data.html) {
        throw new Error(response.data.message || "API mengembalikan error atau tidak ada data HTML.");
      }
      const result = this.parseResultHtml(response.data.html);
      console.log("✅ Berhasil mem-parsing data hasil.");
      return result;
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
        error: "Proses unduhan gagal.",
        errorDetails: error.message
      };
    }
  }
  async getInitialData() {
    try {
      console.log("🍪 Mengambil sesi dan token dari halaman utama...");
      const response = await client.get(`${this.baseUrl}/id`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const tokenInput = $('form#get_video input[type="hidden"]').not('[name="lang"]');
      const tokenName = tokenInput.attr("name");
      const tokenValue = tokenInput.attr("value");
      if (tokenName && tokenValue) {
        return {
          tokenName: tokenName,
          tokenValue: tokenValue
        };
      }
      return null;
    } catch (error) {
      console.error("💥 Gagal saat mengambil data awal:", error.message);
      return null;
    }
  }
  parseResultHtml(html) {
    try {
      const $ = cheerio.load(html);
      const userContainer = $(".threadsmate-downloader");
      const username = userContainer.find(".threadsmate-downloader-middle p span").text().trim();
      const profilePic = userContainer.find(".threadsmate-downloader-left img").attr("src");
      const caption = userContainer.find('h3[itemprop="name"] div').text().trim();
      const media = [];
      $(".download-box li").each((i, el) => {
        const item = $(el);
        const thumbnail = item.find(".download-items__thumb img").attr("src");
        const downloadUrl = item.find(".download-items__btn a").attr("href");
        const buttonText = item.find(".download-items__btn a span span").text().trim();
        const iconClass = item.find(".format-icon i").attr("class");
        let type = "unknown";
        if (iconClass?.includes("dlvideo")) {
          type = "video";
        } else if (iconClass?.includes("dlphoto")) {
          type = "photo";
        }
        if (downloadUrl) {
          media.push({
            type: type,
            thumbnail: thumbnail,
            downloadUrl: downloadUrl,
            buttonText: buttonText
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
      console.error("💥 Error saat mem-parsing HTML hasil:", error.message);
      return {
        success: false,
        error: "Gagal mem-parsing HTML hasil.",
        errorDetails: error.message
      };
    }
  }
  isRetryableError(error) {
    return !error.response || error.response.status >= 500 || ["ECONNABORTED", "ETIMEDOUT"].includes(error.code);
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