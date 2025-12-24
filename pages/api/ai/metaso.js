import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class MetasoClient {
  constructor() {
    this.baseURL = "https://metaso.cn";
    this.searchURL = "https://metaso.cn/api/searchV2";
    this.cookies = "";
    this.token = "";
  }
  async delay(ms) {
    console.log(`[INFO] Menunggu ${ms / 1e3} detik sebelum mencoba lagi...`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async getCookies() {
    try {
      console.log(`[INFO] Mengambil cookie dari: ${this.baseURL}/h5-login?_rsc=19keo`);
      const response = await axios.get(`${this.baseURL}/h5-login?_rsc=19keo`, {
        withCredentials: true
      });
      let cookies = response.headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
      cookies += "; newSearch=true";
      console.log(`[SUCCESS] Cookie diperoleh: ${cookies}`);
      this.cookies = cookies;
      return cookies;
    } catch (error) {
      console.error(`[ERROR] Gagal mengambil cookie:`, error.message);
      return "";
    }
  }
  async getToken() {
    try {
      console.log("[INFO] Mengambil token dari meta-user-info...");
      const response = await axios.get(`${this.baseURL}/meta-user-info`, {
        withCredentials: true
      });
      const $ = cheerio.load(response.data);
      this.token = $('meta[id="meta-token"]').attr("content") || "";
      console.log(`[SUCCESS] Token diperoleh: ${this.token.substring(0, 20)}...`);
      return this.token;
    } catch (error) {
      console.error("[ERROR] Gagal mengambil token:", error.message);
      return null;
    }
  }
  async search({
    prompt: question,
    retries = 5,
    delayMs = 3e3
  }) {
    try {
      if (!this.cookies) await this.getCookies();
      if (!this.token) await this.getToken();
      console.log(`[INFO] Melakukan pencarian untuk: "${question}"`);
      const searchUrl = `${this.searchURL}?question=${encodeURIComponent(question)}&mode=detail&scholarSearchDomain=all&url=${encodeURIComponent(`${this.baseURL}/`)}&lang=en&enableMix=true&newEngine=true&enableImage=true&metaso-h5=1&token=${encodeURIComponent(this.token)}`;
      const headers = {
        Accept: "text/event-stream",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": this.getRandomUserAgent(),
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        Cookie: this.cookies
      };
      console.log(`[INFO] Mengirim permintaan ke ${searchUrl}`);
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v2?url=${encodeURIComponent(searchUrl)}`, {
        headers: headers
      });
      console.log(`[SUCCESS] Data berhasil diambil (${data.length} karakter)`);
      let text = "",
        reference = [],
        recommended = [],
        highlights = [];
      const lines = data.split("\n").filter(l => l.startsWith("data"));
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(5));
          switch (data.type) {
            case "append-text":
              text += data.text || "";
              break;
            case "update-reference":
              reference.push(data.list);
              break;
            case "recommended-question":
              recommended.push(data.data);
              break;
            case "answer-link-num-highlights":
              highlights.push(data.data);
              break;
          }
        } catch (e) {}
      }
      return {
        text: text,
        reference: reference,
        recommended: recommended,
        highlights: highlights
      };
    } catch (error) {
      if (error.response?.status === 429 && retries > 0) {
        console.warn(`[WARNING] [TOO_MANY_REQUESTS] - Coba ulang dalam ${delayMs / 1e3} detik...`);
        await this.delay(delayMs);
        return this.search(question, retries - 1, delayMs * 2);
      }
      console.error("[ERROR] Gagal melakukan pencarian:", error.message);
      return null;
    }
  }
  getRandomUserAgent() {
    return "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const metaso = new MetasoClient();
  try {
    const data = await metaso.search(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}