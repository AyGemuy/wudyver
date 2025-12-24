import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class PlaywrightAPI {
  constructor() {
    this.tokenApi = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`;
    this.runApi = "https://try.playwright.tech/service/control/run";
    this.siteKey = "0x4AAAAAAA_K0T_2LZ0rgUtv";
    this.url = "https://try.playwright.tech";
  }
  async getToken() {
    try {
      console.log("🔑 Mendapatkan token...");
      const {
        data
      } = await axios.get(`${this.tokenApi}?sitekey=${this.siteKey}&url=${this.url}`);
      const token = data?.token;
      console.log("✅ Token:", token?.slice(0, 30) + "...");
      return token;
    } catch (e) {
      console.error("❌ Gagal mendapatkan token:", e.message);
      return "";
    }
  }
  async execute({
    code = 'console.log("hello world")',
    lang = "javascript"
  } = {}) {
    try {
      const token = await this.getToken();
      if (!token) throw new Error("Token kosong");
      console.log("🚀 Menjalankan kode...");
      const res = await axios.post(this.runApi, {
        code: code,
        language: lang,
        token: token
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
          Referer: this.url
        }
      });
      console.log("✅ Respons diterima");
      return res.data;
    } catch (e) {
      console.error("❌ Gagal menjalankan kode:", e.message);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.code) {
    return res.status(400).json({
      error: "Code diperlukan."
    });
  }
  try {
    const playwright = new PlaywrightAPI();
    const result = await playwright.execute(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}