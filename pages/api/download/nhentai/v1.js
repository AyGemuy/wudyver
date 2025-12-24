import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class FacebDownloader {
  constructor() {
    this.base = "https://faceb.com";
    this.base_nhentai = "https://nhentai.net/g/";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.base,
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        "X-Requested-With": "XMLHttpRequest"
      }
    }));
    this.pollDelay = 3e3;
  }
  async getCSRFToken() {
    try {
      console.log("🌐 Mengambil cookie awal untuk token CSRF...");
      const res = await this.client.get("/nhentai/");
      const cookies = await this.jar.getCookies(this.base);
      const csrf = cookies.find(c => c.key === "csrftoken")?.value;
      if (!csrf) {
        console.error("⚠️ Cookie ditemukan:", cookies.map(c => c.key).join(", "));
        throw new Error("Token CSRF tidak ditemukan dalam cookie");
      }
      console.log("✅ Token CSRF dari cookie:", csrf);
      return csrf;
    } catch (err) {
      console.error("❌ Gagal mengambil CSRF token:", err.message);
      throw err;
    }
  }
  async submitTask(url) {
    try {
      const csrf = await this.getCSRFToken();
      console.log(`🚀 Mengirim task ke Faceb: ${url}`);
      const data = new URLSearchParams({
        csrfmiddlewaretoken: csrf,
        url: url
      }).toString();
      const res = await this.client.post("/api/manager/", data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Referer: `${this.base}/nhentai/`
        }
      });
      const job = res.data?.job_ids?.[0];
      if (!job?.job_id) {
        console.error("⚠️ Respons submit:", res.data);
        throw new Error("Gagal mendapatkan job_id dari Faceb");
      }
      console.log(`🆔 Job berhasil dibuat: ${job.job_id}`);
      return job.job_id;
    } catch (err) {
      console.error("❌ Gagal submit task:", err.message);
      throw err;
    }
  }
  async pollResult(jobId) {
    console.log(`⏳ Memulai polling untuk job: ${jobId}`);
    const start = Date.now();
    while (true) {
      try {
        const res = await this.client.get(`/api/result/?job_id=${jobId}`);
        const {
          html
        } = res.data || {};
        if (!html) {
          console.log("⌛ Belum ada hasil, tunggu 5 detik...");
          await this.sleep(this.pollDelay);
          continue;
        }
        const parsed = this.parseHTML(html);
        if (parsed.length) {
          console.log(`✅ ${parsed.length} hasil ditemukan.`);
          return parsed;
        }
        console.log("⚠️ HTML belum berisi hasil valid, lanjut polling...");
        await this.sleep(this.pollDelay);
      } catch (err) {
        console.error("⚠️ Polling error:", err.message);
        if (Date.now() - start > 18e4) {
          throw new Error("⏰ Timeout polling (3 menit)");
        }
        await this.sleep(this.pollDelay);
      }
    }
  }
  parseHTML(html) {
    try {
      const $ = cheerio.load(html);
      const results = [];
      $(".result-item").each((_, el) => {
        const img = $(el).find("img[data-src]").attr("data-src");
        const dl = $(el).find("a.download-button").attr("href");
        const proxy = dl ? new URL(dl, this.base).href : null;
        if (img) {
          results.push({
            image: new URL(img, this.base).href,
            download: proxy
          });
        }
      });
      return results;
    } catch (err) {
      console.error("❌ Gagal parse HTML:", err.message);
      return [];
    }
  }
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  normalizeUrl(input) {
    if (!input) throw new Error("Input kosong!");
    input = input.trim();
    if (/^https?:\/\//i.test(input) || /nhentai/i.test(input)) return input;
    if (/^\d+$/.test(input)) return `${this.base_nhentai}${input}/`;
    const idMatch = input.match(/(\d{4,})/);
    if (idMatch) return `${this.base_nhentai}${idMatch[1]}/`;
    throw new Error("Input tidak valid, tidak ada ID terdeteksi!");
  }
  async download({
    url
  }) {
    try {
      console.log("=== 🚀 Memulai FacebDownloader ===");
      const input = this.normalizeUrl(url);
      const jobId = await this.submitTask(input);
      const results = await this.pollResult(jobId);
      return {
        status: "success",
        total: results.length,
        results: results
      };
    } catch (err) {
      console.error("🔥 Gagal menjalankan FacebDownloader:", err.message);
      return {
        status: "failed",
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const api = new FacebDownloader();
    const response = await api.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}