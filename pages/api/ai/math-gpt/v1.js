import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class MathGPT {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://math-gpt.pro",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        origin: "https://math-gpt.pro",
        referer: "https://math-gpt.pro/"
      }
    }));
    this.token = null;
  }
  log(msg, type = "info") {
    console.log(`[${new Date().toISOString()}] [MathGPT] [${type.toUpperCase()}] ${msg}`);
  }
  async init() {
    try {
      if (this.token) return this.token;
      this.log("Fetching main page for tokens...");
      const res = await this.client.get("/");
      const $ = cheerio.load(res?.data || "");
      this.token = $('meta[name="csrf-token"]').attr("content");
      if (!this.token) throw new Error("CSRF Token not found");
      this.log(`Token acquired: ${this.token.substring(0, 10)}...`);
      return this.token;
    } catch (e) {
      this.log(e.message, "error");
      throw e;
    }
  }
  async buff(media) {
    try {
      if (!media) return null;
      if (Buffer.isBuffer(media)) return media;
      if (typeof media === "string" && media.startsWith("http")) {
        this.log("Downloading media from URL...");
        const res = await axios.get(media, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof media === "string" && (media.startsWith("data:") || media.match(/^[a-zA-Z0-9+/=]+$/))) {
        this.log("Converting Base64 to Buffer...");
        const base64Data = media.includes(",") ? media.split(",")[1] : media;
        return Buffer.from(base64Data, "base64");
      }
      return null;
    } catch (e) {
      this.log("Media conversion failed", "error");
      return null;
    }
  }
  async up(buffer) {
    try {
      if (!buffer) return "";
      this.log("Uploading image...");
      const form = new FormData();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      form.append("image", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      form.append("_token", this.token);
      const res = await this.client.post("/upload-image", form, {
        headers: {
          ...form.getHeaders(),
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const fileName = res?.data?.file;
      if (!fileName) throw new Error("Upload failed, no filename returned");
      this.log(`Image uploaded: ${fileName}`);
      return fileName;
    } catch (e) {
      this.log(`Upload Error: ${e.message}`, "error");
      throw e;
    }
  }
  async chat({
    prompt,
    media,
    ...rest
  }) {
    try {
      await this.init();
      const mediaBuffer = await this.buff(media);
      const uploadedFile = mediaBuffer ? await this.up(mediaBuffer) : "";
      this.log("Sending chat request...");
      const payload = {
        message: prompt || "Solve this",
        image: uploadedFile,
        _token: this.token,
        ...rest
      };
      const res = await this.client.post("/chat", payload, {
        headers: {
          "content-type": "application/json",
          "x-csrf-token": this.token,
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const reply = res?.data?.reply || "No response from server";
      this.log("Process finished successfully.");
      return {
        status: true,
        result: reply,
        metadata: {
          image_used: uploadedFile || null
        }
      };
    } catch (e) {
      this.log(e.message, "error");
      return {
        status: false,
        msg: e.message || "Unknown error occurred"
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
  const api = new MathGPT();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}