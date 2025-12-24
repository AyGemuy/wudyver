import CryptoJS from "crypto-js";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class TeraboxDownloader {
  constructor() {
    this.siteKey = "0x4AAAAAAAivEqKZjLXwt9uG";
    this.cfApi = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`;
    this.baseUrl = "https://teradownloader.com/api";
    this.key = "89javhk4q98adklajsdf09q34090934kjaslkjf";
  }
  encPayload(payload) {
    try {
      console.log("[Encryption] Payload:", payload);
      const jsonString = JSON.stringify(payload);
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.key).toString();
      console.log("[Encryption] Success:", encrypted.substring(0, 50) + "...");
      return encrypted;
    } catch (err) {
      console.error("[Encryption] Failed:", err);
      throw err;
    }
  }
  encData(url, turnstileToken) {
    if (!turnstileToken) throw new Error("Missing turnstile token");
    const payload = {
      token: url,
      turn: turnstileToken,
      expiresAt: Date.now() + 2e4
    };
    return this.encPayload(payload);
  }
  async getToken() {
    console.log("[Turnstile] Requesting token...");
    try {
      const res = await axios.get(this.cfApi, {
        params: {
          mode: "turnstile-min",
          sitekey: this.siteKey,
          url: "https://teradownloader.com/"
        }
      });
      console.log("[Turnstile] Token:", res.data.token.substring(0, 15) + "...");
      return res.data.token;
    } catch (err) {
      console.error("[Turnstile] Failed:", err.response?.data || err);
      throw err;
    }
  }
  async download({
    url
  }) {
    console.log(`[Download] Starting for: ${url}`);
    try {
      const turnstileToken = await this.getToken();
      const encryptedData = this.encData(url, turnstileToken);
      const res = await axios.get(this.baseUrl, {
        params: {
          data: encryptedData
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
          Referer: `https://teradownloader.com/download?l=${encodeURIComponent(url)}`
        }
      });
      console.log("[Download] Completed");
      return res.data;
    } catch (err) {
      console.error("[Download] Failed:", err);
      throw err;
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
  const api = new TeraboxDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}