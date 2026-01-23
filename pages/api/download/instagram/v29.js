import axios from "axios";
import crypto from "crypto";
class InLoader {
  constructor() {
    this.pkg = "story.saver.reels.downloader";
    this.ua = "okhttp/4.12.0";
    this.base = "https://inload.app/api";
    this.devId = crypto.randomBytes(16).toString("hex");
    this.token = "";
  }
  async reg() {
    try {
      console.log(`[LOG] Auth Device: ${this.devId}`);
      const body = {
        platform: "A",
        package_name: this.pkg,
        version: "18.0.0",
        device_id: this.devId
      };
      const {
        data
      } = await axios.post(`${this.base}/register`, body, {
        headers: {
          "User-Agent": this.ua,
          "package-name": this.pkg
        }
      });
      this.token = data?.data?.token || "";
      return this.token;
    } catch (e) {
      console.log(`[ERR] Reg failed: ${e.message}`);
      return null;
    }
  }
  async get(link, customPayload = {}) {
    try {
      console.log(`[LOG] Requesting API for: ${link.slice(0, 30)}...`);
      const body = {
        device_id: this.devId,
        token: this.token,
        link: link,
        referer: "video",
        locale: "en",
        ...customPayload
      };
      const {
        data
      } = await axios.post(`${this.base}/app-fetch`, body, {
        headers: {
          "User-Agent": this.ua,
          "package-name": this.pkg
        }
      });
      return data?.data || {};
    } catch (e) {
      console.log(`[ERR] Fetch failed: ${e.message}`);
      return {};
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      const target = url || rest?.link || "";
      if (!target) throw new Error("URL is required");
      this.token = this.token ? this.token : await this.reg();
      const {
        media,
        ...info
      } = await this.get(target, rest);
      const result = [media].filter(Boolean).map(item => ({
        ...item,
        timestamp: Date.now()
      }));
      console.log(`[LOG] Process Done. Result count: ${result.length}`);
      return {
        result: result,
        ...info
      };
    } catch (e) {
      console.log(`[ERR] Download process error: ${e.message}`);
      return {
        result: [],
        error: e.message
      };
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
  const api = new InLoader();
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