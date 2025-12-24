import axios from "axios";
import * as cheerio from "cheerio";
class SpotdlDownloader {
  constructor(baseURL, headers) {
    this.cookieStore = {};
    this.api = axios.create({
      baseURL: baseURL || "https://spotdl.io",
      headers: headers || {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        Priority: "u=1, i"
      }
    });
    this.setupInterceptors();
    this.csrfToken = null;
    console.log("AxiosClient initialized");
  }
  setupInterceptors() {
    this.api.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookieString => {
          const cookiePair = cookieString.split(";")[0];
          const [name, value] = cookiePair.split("=");
          if (name && value) {
            this.cookieStore[name.trim()] = value.trim();
          }
        });
        console.log("Proses: Cookies diperbarui:", this.cookieStore);
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
    this.api.interceptors.request.use(config => {
      const cookieKeys = Object.keys(this.cookieStore);
      if (cookieKeys.length > 0) {
        const cookieString = cookieKeys.map(key => `${key}=${this.cookieStore[key]}`).join("; ");
        config.headers["Cookie"] = cookieString;
        console.log(`Proses: Mengirim cookies: ${cookieString}`);
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
  }
  async getToken() {
    console.log("Proses: Mengambil CSRF token...");
    try {
      const response = await this.api.get("/");
      const html = response.data;
      const $ = cheerio.load(html);
      const token = $('meta[name="csrf-token"]').attr("content") || null;
      if (token) {
        this.csrfToken = token;
        this.api.defaults.headers.common["x-csrf-token"] = this.csrfToken;
        console.log(`Proses: CSRF token ditemukan: ${this.csrfToken}`);
      } else {
        console.error("Proses: Gagal menemukan CSRF token.");
      }
      return this.csrfToken;
    } catch (error) {
      console.error("Error saat mengambil token:", error.message);
      console.error("Detail Error:", error.response?.data);
      throw error;
    }
  }
  async getTrack(spotifyUrl) {
    console.log(`Proses: Mendapatkan data untuk URL: ${spotifyUrl}`);
    if (!this.csrfToken) {
      console.log("Proses: CSRF token tidak ditemukan, menjalankan getToken()...");
      await this.getToken();
    }
    try {
      const response = await this.api.post("/getTrackData", {
        spotify_url: spotifyUrl
      });
      console.log("Proses: Berhasil mendapatkan data track.");
      return response.data;
    } catch (error) {
      console.error("Error saat mendapatkan data track:", error.message);
      console.error("Detail Error:", error.response?.data);
      throw error;
    }
  }
  async convert(trackUrl) {
    console.log(`Proses: Mengonversi URL: ${trackUrl}`);
    try {
      const response = await this.api.post("/convert", {
        urls: trackUrl
      });
      const downloadUrl = response.data?.url ? response.data.url : "URL tidak ditemukan";
      console.log(`Proses: Berhasil mendapatkan link konversi.`);
      return response.data;
    } catch (error) {
      console.error("Error saat konversi:", error.message);
      console.error("Detail Error:", error.response?.data);
      throw error;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log("Proses: Memulai proses unduhan...");
    try {
      const meta = await this.getTrack(url);
      const convertResponse = await this.convert(url);
      const finalUrl = convertResponse?.url || null;
      if (!finalUrl) {
        console.log("Proses: Gagal mendapatkan URL unduhan akhir.");
        return null;
      }
      console.log(`Proses: URL unduhan akhir: ${finalUrl}`);
      console.log("Proses: Simulasi download, tidak mengunduh file secara aktual.");
      return {
        result: finalUrl,
        ...meta
      };
    } catch (error) {
      console.error("Proses unduhan gagal:", error.message);
      return null;
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
    const downloader = new SpotdlDownloader();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}