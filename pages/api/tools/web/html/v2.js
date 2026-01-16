import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class Duplichecker {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.baseURL = "https://www.duplichecker.com";
    this.csrfToken = "";
  }
  async getCsrfToken() {
    try {
      const {
        data,
        headers
      } = await this.client.get(`${this.baseURL}/html-viewer`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
          Referer: this.baseURL
        }
      });
      const $ = cheerio.load(data);
      this.csrfToken = $('meta[name="csrf-token"]').attr("content") || "";
      if (!this.csrfToken) throw new Error("CSRF token tidak ditemukan");
      return this.csrfToken;
    } catch (error) {
      throw new Error(`Gagal mengambil CSRF token: ${error.message}`);
    }
  }
  async download({
    url: urlPath
  }) {
    if (!this.csrfToken) await this.getCsrfToken();
    const formData = new URLSearchParams();
    formData.append("path", urlPath);
    try {
      const {
        data
      } = await this.client.post(`${this.baseURL}/get-url-Content`, formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-CSRF-TOKEN": this.csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
          Referer: `${this.baseURL}/html-viewer`
        }
      });
      return data;
    } catch (error) {
      throw new Error(`Gagal mengambil konten URL: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Duplichecker();
  try {
    const result = await api.download(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}