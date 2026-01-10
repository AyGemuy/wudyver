import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class ImageGen {
  constructor() {
    this.api = "https://aimagegen.com/api";
    this.vId = crypto.randomBytes(16).toString("hex");
    this.http = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
        Referer: "https://aimagegen.com/"
      }
    });
  }
  async mail() {
    try {
      console.log("[LOG] Meminta Cloudflare Token...");
      const {
        data
      } = await this.http.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          url: "https://aimagegen.com/",
          sitekey: "0x4AAAAAAA7uZWK1AKRkI6tZ"
        }
      });
      return data?.token || null;
    } catch (e) {
      console.error("[ERROR] Gagal ambil token:", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    aspect = "9:16",
    ...rest
  }) {
    try {
      const token = await this.mail() || "";
      console.log(`[LOG] ID: ${this.vId} | Prompt: ${prompt.slice(0, 30)}...`);
      const form = new URLSearchParams();
      form.append("prompt", prompt);
      form.append("aspectRatio", aspect);
      form.append("model", rest.model || "Text to Image");
      const {
        data
      } = await this.http.post(`${this.api}/generate/image`, form, {
        headers: {
          turnstileToken: token,
          visitorId: this.vId
        }
      });
      const tid = data?.id;
      return tid ? await this.poll(tid) : {
        error: "Task ID not found"
      };
    } catch (e) {
      console.error("[ERROR] Generate failed:", e.response?.data || e.message);
      return {
        status: "error",
        msg: e.message
      };
    }
  }
  async poll(id) {
    let complete = false;
    let attempts = 0;
    console.log(`[LOG] Start polling task: ${id}`);
    try {
      while (!complete) {
        const {
          data
        } = await this.http.get(`${this.api}/tasks/${id}`);
        const {
          status,
          percent,
          imageUrl,
          failed_msg,
          ...info
        } = data || {};
        const state = status ?? "processing";
        console.log(`[LOG] [${id}] Status: ${state} (${percent || 0}%)`);
        if (state === "success") {
          complete = true;
          console.log("[LOG] Success! Image generated.");
          return {
            result: imageUrl,
            ...info
          };
        }
        if (state === "failed") {
          complete = true;
          return {
            error: failed_msg || "Task failed",
            ...info
          };
        }
        if (attempts++ > 60) throw new Error("Timeout polling");
        await new Promise(r => setTimeout(r, 3e3));
      }
    } catch (e) {
      console.error("[ERROR] Polling loop error:", e.message);
      return {
        status: "error",
        msg: e.message
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
  const api = new ImageGen();
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