import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class NanoBananoAI {
  constructor() {
    this.base = "https://nanabanano.ai/api";
    this.cookie = "";
  }
  headers(json = false) {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": json ? "application/json" : undefined,
      cookie: this.cookie,
      origin: "https://nanabanano.ai",
      referer: "https://nanabanano.ai/dashboard",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  log(msg, data) {
    console.log(`[NanoBananoAI] ${msg}`, data || "");
  }
  detectType(b64) {
    if (typeof b64 !== "string") return {
      ext: "png",
      mime: "image/png"
    };
    if (b64.includes("jpeg")) return {
      ext: "jpg",
      mime: "image/jpeg"
    };
    if (b64.includes("png")) return {
      ext: "png",
      mime: "image/png"
    };
    if (b64.includes("webp")) return {
      ext: "webp",
      mime: "image/webp"
    };
    return {
      ext: "png",
      mime: "image/png"
    };
  }
  async pollStatus(taskId) {
    const url = `${this.base}/image/status/${taskId}`;
    for (let i = 0; i < 60; i++) {
      try {
        const r = await axios.get(url, {
          headers: this.headers()
        });
        const d = r.data;
        if (d?.status === 1) return d;
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        this.log("Status check error:", e.message);
      }
    }
    throw new Error("Timeout waiting for image generation");
  }
  async generate({
    prompt,
    imageUrl,
    aspectRatio = "1:1",
    model = "nano-banana",
    addWatermark = true,
    ...opt
  }) {
    try {
      const isImg2Img = !!imageUrl;
      this.log(isImg2Img ? "🖼️ Img2Img..." : "🎨 Txt2Img...");
      if (!isImg2Img) {
        const r = await axios.post(`${this.base}/text-to-image/generate`, {
          prompt: prompt,
          aspectRatio: aspectRatio
        }, {
          headers: this.headers(true)
        });
        const taskId = r?.data?.taskId;
        if (!taskId) throw new Error("No taskId returned");
        this.log("Task created:", taskId);
        const url = await this.pollStatus(taskId);
        this.log("Generated:", url);
        return url;
      }
      let buf, type;
      const form = new FormData();
      if (Buffer.isBuffer(imageUrl)) {
        buf = imageUrl;
        type = {
          ext: "png",
          mime: "image/png"
        };
      } else if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
        buf = Buffer.from(imageUrl.split(",")[1], "base64");
        type = this.detectType(imageUrl);
      } else if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        const res = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res.data);
        const mime = res.headers["content-type"] || "image/jpeg";
        type = {
          ext: mime.split("/")[1],
          mime: mime
        };
      } else throw new Error("Invalid image input");
      form.append("prompt", prompt);
      form.append("addWatermark", String(addWatermark));
      form.append("inputMode", "upload");
      form.append("model", model);
      form.append("images", buf, {
        filename: `img_${crypto.randomBytes(4).toString("hex")}.${type.ext}`,
        contentType: type.mime
      });
      const r = await axios.post(`${this.base}/image/generate`, form, {
        headers: {
          ...this.headers(),
          ...form.getHeaders()
        }
      });
      const taskId = r?.data?.taskId;
      if (!taskId) throw new Error("No taskId returned");
      this.log("Task created:", taskId);
      const url = await this.pollStatus(taskId);
      this.log("Generated:", url);
      return url;
    } catch (e) {
      this.log("Generate error:", e?.response?.data || e.message);
      return null;
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
  const api = new NanoBananoAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}