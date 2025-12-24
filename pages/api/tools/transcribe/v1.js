import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class TalknotesConverter {
  constructor() {
    this.pageUrl = "https://talknotes.io/tools/transcribe-to-text";
    this.endpoint = "https://api.talknotes.io/tools/converter";
    this.apiKey = null;
    this.token = null;
    this.timestamp = null;
    this.headers = {
      accept: "*/*",
      origin: "https://talknotes.io",
      referer: "https://talknotes.io/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async fetchApiKey() {
    try {
      const res = await axios.get(this.pageUrl);
      const $ = cheerio.load(res.data);
      const scriptTags = $("script");
      for (let i = 0; i < scriptTags.length; i++) {
        const html = $(scriptTags[i]).html();
        if (html?.includes("window.__NUXT__") && html.includes("toolsApiKey")) {
          console.log("[+] Found script with __NUXT__ and toolsApiKey");
          const toolsApiKeyMatch = html.match(/toolsApiKey\s*:\s*["']([^"']+)["']/);
          if (!toolsApiKeyMatch) {
            throw new Error("Could not extract toolsApiKey value");
          }
          const key = toolsApiKeyMatch[1];
          console.log("[+] Extracted toolsApiKey:", key);
          this.apiKey = key;
          return key;
        }
      }
      throw new Error("window.__NUXT__ script with toolsApiKey not found");
    } catch (err) {
      console.error("[-] Failed to fetch API key:", err.message);
      throw err;
    }
  }
  generateToken() {
    try {
      if (!this.apiKey) throw new Error("API key not set");
      this.timestamp = Date.now().toString();
      this.token = CryptoJS.HmacSHA256(this.timestamp, this.apiKey).toString();
      return {
        "x-token": this.token,
        "x-timestamp": this.timestamp
      };
    } catch (err) {
      console.error("[-] Failed to generate token:", err.message);
      throw err;
    }
  }
  async getAuthHeaders() {
    if (!this.apiKey) await this.fetchApiKey();
    return this.generateToken();
  }
  async toBuffer(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("data:")) {
          return Buffer.from(input.split(",")[1], "base64");
        } else if (input.startsWith("http://") || input.startsWith("https://")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
      }
      throw new Error("Unsupported input. Must be URL, base64, or Buffer.");
    } catch (err) {
      console.error("[-] Failed to process input:", err.message);
      throw err;
    }
  }
  async generate({
    input,
    filename = "file.mp3"
  }) {
    try {
      const buffer = await this.toBuffer(input);
      const auth = await this.getAuthHeaders();
      const form = new FormData();
      form.append("file", buffer, {
        filename: filename,
        contentType: "audio/mpeg"
      });
      const headers = {
        ...form.getHeaders(),
        ...this.headers,
        ...auth
      };
      const res = await axios.post(this.endpoint, form, {
        headers: headers
      });
      console.log("[✓] Upload success");
      return res.data;
    } catch (err) {
      console.error("[-] Conversion failed:", err.message);
      return {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new TalknotesConverter();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}