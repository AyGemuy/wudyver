import axios from "axios";
import * as cheerio from "cheerio";
class NevLtShortener {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://nev.lt",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        origin: "https://nev.lt"
      }
    });
    this.cookies = null;
    this.handleToken = null;
    this.initialized = false;
    this.axiosInstance.interceptors.request.use(config => {
      if (this.cookies) {
        config.headers["cookie"] = this.cookies;
      }
      config.headers["origin"] = "https://nev.lt";
      return config;
    }, error => {
      console.error("Interceptor Error:", error.message);
      return Promise.reject(error);
    });
  }
  async init() {
    if (this.initialized) return;
    console.log("Inisialisasi: Mulai...");
    try {
      const response = await this.axiosInstance.get("/");
      const setCookieHeader = response.headers["set-cookie"];
      this.cookies = setCookieHeader?.map(c => c.split(";")[0]).join("; ") || null;
      console.log(`Inisialisasi: Cookie ${this.cookies ? "diambil" : "tidak ditemukan"}.`);
      const $ = cheerio.load(response.data);
      this.handleToken = $('input[name="handle"]').val() || null;
      if (!this.handleToken) {
        throw new Error("Token handle tidak ditemukan di halaman.");
      }
      console.log("Inisialisasi: Token handle diambil.");
      this.initialized = true;
      console.log("Inisialisasi: Selesai.");
    } catch (error) {
      console.error("Inisialisasi Error:", error.message);
      this.initialized = false;
      throw error;
    }
  }
  async short({
    url
  } = {}) {
    if (!url) {
      throw new Error("URL target diperlukan untuk dipendekkan.");
    }
    console.log(`Proses: Memendekkan ${url}`);
    if (!this.initialized) {
      console.log("Proses: Inisialisasi diperlukan, menjalankan init()...");
      await this.init();
    }
    if (!this.handleToken) {
      throw new Error("Token handle tidak ada setelah inisialisasi, tidak dapat melanjutkan.");
    }
    try {
      const postData = new URLSearchParams({
        handle: this.handleToken,
        url: url
      }).toString();
      const response = await this.axiosInstance.post("/programs/url", postData, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      if (response?.data && typeof response.data === "string") {
        const $ = cheerio.load(response.data);
        const parsedHtmlUrl = $("div.copy[data-nevfar]").attr("data-nevfar");
        if (parsedHtmlUrl) {
          console.log("Proses: URL pendek dari HTML:", parsedHtmlUrl);
          return {
            result: parsedHtmlUrl
          };
        }
        throw new Error("Gagal ekstrak URL pendek. Respons: " + response.data.substring(0, 100) + "...");
      }
      throw new Error("Format respons tidak dikenal. Data: " + String(response?.data).substring(0, 100));
    } catch (error) {
      console.error(`Proses Error (memendekkan ${url}):`, error.message);
      if (error.response) {
        console.error(`Detail Error: Status ${error.response.status}, Data: ${String(error.response.data).substring(0, 100)}...`);
      }
      throw error;
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
    const shortener = new NevLtShortener();
    const response = await shortener.short(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}