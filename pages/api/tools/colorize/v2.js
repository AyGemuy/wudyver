import axios from "axios";
import FormData from "form-data";
class ImageColorizer {
  constructor() {
    this.cfg = {
      upUrl: "https://kolorize.cc/api/upload",
      lkUrl: "https://kolorize.cc/api/lookup",
      hdrs: {
        accept: "*/*",
        origin: "https://kolorize.cc",
        referer: "https://kolorize.cc/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    };
  }
  slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async getBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith?.("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const raw = input?.includes?.("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(raw || "", "base64");
    } catch (e) {
      throw new Error(`Buffer Resolve Error: ${e.message}`);
    }
  }
  async up(buf) {
    try {
      console.log("[Process] Uploading to Kolorize...");
      const form = new FormData();
      form.append("files", buf, {
        filename: "input.jpg",
        contentType: "image/jpeg"
      });
      const res = await axios.post(this.cfg.upUrl, form, {
        headers: {
          ...this.cfg.hdrs,
          ...form.getHeaders()
        }
      });
      return res?.data?.results?.[0] || null;
    } catch (e) {
      throw new Error(`Upload Kolorize Gagal: ${e.message}`);
    }
  }
  async lk(key, mode) {
    try {
      const res = await axios.post(this.cfg.lkUrl, {
        keyOrUrl: key,
        mode: mode || 6,
        r: 1,
        forceH: 0
      }, {
        headers: {
          ...this.cfg.hdrs,
          "content-type": "application/json"
        }
      });
      return res?.data;
    } catch (e) {
      return null;
    }
  }
  parse(base64Str) {
    try {
      console.log("[Process] Uploading result to Wudysoft...");
      const cleanB64 = base64Str?.includes?.("base64,") ? base64Str.split("base64,")[1] : base64Str;
      const buf = Buffer.from(cleanB64, "base64");
      return {
        buffer: buf,
        contentType: "image/jpeg"
      };
    } catch (e) {
      throw new Error(`Upload Wudysoft Gagal: ${e.message}`);
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("[Process] Starting Kolorize Task...");
      const buf = await this.getBuf(imageUrl);
      const task = await this.up(buf);
      if (!task?.sourceKey) throw new Error("Gagal mendapatkan sourceKey");
      const key = task.sourceKey;
      console.log(`[Process] Task ID: ${key}. Polling result...`);
      let finalBase64 = null;
      for (let i = 0; i < 60; i++) {
        await this.slp(3e3);
        const status = await this.lk(key, rest.mode || 2);
        if (status?.imgUrl?.startsWith?.("data:image")) {
          console.log("[Process] Success! Image received.");
          finalBase64 = status.imgUrl;
          break;
        }
        console.log(`[Process] Attempt ${i + 1}/60: Processing...`);
      }
      if (!finalBase64) throw new Error("Polling timeout or no image received");
      return this.parse(finalBase64);
    } catch (e) {
      console.error("[Error]", e.message);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new ImageColorizer();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}