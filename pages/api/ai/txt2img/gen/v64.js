import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class SkyFortress {
  constructor() {
    this.api = "https://skyfortress.dev/api";
    this.siteKey = "0x4AAAAAAB2VzkPkttut7cSl";
    this.visitorId = crypto.randomBytes(16).toString("hex");
    this.http = axios.create({
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
        Referer: "https://skyfortress.dev/"
      }
    });
  }
  async getCfToken() {
    try {
      console.log("[LOG] Solving Turnstile...");
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          url: "https://skyfortress.dev/",
          sitekey: this.siteKey
        }
      });
      return data?.token || null;
    } catch (e) {
      console.error("[ERROR] Gagal bypass Cloudflare:", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    ...options
  }) {
    try {
      const rawToken = await this.getCfToken();
      if (!rawToken) throw new Error("Gagal mendapatkan Turnstile Token");
      const concealedToken = `${rawToken}:${this.visitorId}`;
      const payload = {
        prompt: prompt,
        negativePrompt: options.negativePrompt || "lowres, bad anatomy, bad hands, text, error",
        width: options.width || 768,
        height: options.height || 768,
        guidanceScale: options.guidanceScale || 7.5,
        steps: options.steps || 25,
        seed: options.seed || Math.floor(Math.random() * 1e9),
        turnstileToken: concealedToken,
        ...options
      };
      console.log("[LOG] Mengirim permintaan generate ke SkyFortress...");
      const {
        data
      } = await this.http.post(`${this.api}/generate-image`, payload, {
        timeout: 18e4
      });
      if (data.url) {
        const baseUrl = "https://skyfortress.dev";
        console.log("[LOG] Generate Berhasil!");
        return {
          status: "success",
          imageUrl: data.url.startsWith("http") ? data.url : `${baseUrl}${data.url}`,
          seed: payload.seed,
          prompt: payload.prompt
        };
      } else {
        throw new Error(data.message || "No image URL returned");
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      console.error("[ERROR] Generate gagal:", msg);
      return {
        status: "error",
        msg: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new SkyFortress();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}