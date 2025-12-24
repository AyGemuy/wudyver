import axios from "axios";
import FormData from "form-data";
class VoooAI {
  constructor() {
    this.api = "https://voooai.com/api";
    this.headers = {
      accept: "*/*",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      origin: "https://voooai.com",
      referer: "https://voooai.com/"
    };
  }
  async solve(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof input === "string" && input.includes("base64,")) {
        return Buffer.from(input.split("base64,")[1], "base64");
      }
      return Buffer.from(input, "base64");
    } catch (e) {
      console.log("[Error] Solve Image:", e.message);
      return null;
    }
  }
  async up(img) {
    try {
      console.log("[Process] Uploading reference image...");
      const buffer = await this.solve(img);
      const fd = new FormData();
      fd.append("file", buffer, {
        filename: "image.webp",
        contentType: "image/webp"
      });
      const res = await axios.post(`${this.api}/upload-reference-image`, fd, {
        headers: {
          ...this.headers,
          ...fd.getHeaders()
        }
      });
      return res?.data?.image_id || null;
    } catch (e) {
      console.log("[Error] Upload:", e.message);
      return null;
    }
  }
  parse(str) {
    try {
      console.log("[Process] Parsing result...");
      const part = str?.split("||")?.find(s => s.startsWith("data:image")) || "";
      const [meta, base64] = part.split("base64,");
      return {
        buffer: Buffer.from(base64 || "", "base64"),
        contentType: meta?.split(":")[1]?.split(";")[0] || "image/png"
      };
    } catch (e) {
      console.log("[Error] Parse:", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("[Process] Initializing generation...");
      const ids = [];
      const imgs = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
      for (const item of imgs) {
        const id = await this.up(item);
        if (id) ids.push(id);
      }
      const payload = {
        prompt: prompt || "cute cat",
        image_size: rest?.size || "512x512",
        aspect_ratio: rest?.ratio || "1:1",
        model_type: ids.length > 0 ? "nano-banana" : "z-image",
        reference_image_ids: ids,
        resolution_tier: "base",
        membership_level: 0,
        ...rest
      };
      console.log("[Process] Requesting direct-image-generate...");
      const res = await axios.post(`${this.api}/direct-image-generate`, payload, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      const raw = res?.data?.image_url || "";
      return raw ? this.parse(raw) : {
        error: "No image URL"
      };
    } catch (e) {
      console.log("[Error] Generate:", e?.response?.data || e.message);
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
  const api = new VoooAI();
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