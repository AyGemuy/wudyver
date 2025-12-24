import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
import SpoofHead from "@/lib/spoof-head";
class LucaBackgroundRemove {
  constructor() {
    this.baseURL = "https://luca115-background-removal.hf.space/gradio_api";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "accept-language": "id-ID",
      origin: "https://luca115-background-removal.hf.space",
      referer: "https://luca115-background-removal.hf.space/",
      ...SpoofHead()
    };
    this.uploadId = Math.random().toString(36).slice(2);
    this.sessionHash = "bg" + Math.random().toString(36).slice(2);
  }
  async upload(imageInput) {
    let buffer, mime, filename;
    try {
      if (Buffer.isBuffer(imageInput)) {
        buffer = imageInput;
        mime = this.detectMimeFromBuffer(buffer) || "image/png";
        filename = `upload.${mime.split("/")[1] || "png"}`;
      } else if (typeof imageInput === "string") {
        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
          console.log(`[BG-REMOVE] Downloading from URL: ${imageInput}`);
          const imgRes = await axios.get(imageInput, {
            responseType: "arraybuffer",
            headers: this.headers
          });
          buffer = Buffer.from(imgRes.data);
          mime = imgRes.headers["content-type"] || "image/jpeg";
          filename = `upload.${mime.split("/")[1] || "jpg"}`;
        } else if (imageInput.startsWith("data:image/")) {
          console.log(`[BG-REMOVE] Processing data URL (base64)`);
          const matches = imageInput.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (!matches) throw new Error("Invalid data URL format");
          mime = matches[1];
          buffer = Buffer.from(matches[2], "base64");
          filename = `upload.${mime.split("/")[1]}`;
        } else if (/^[A-Za-z0-9+/=]+$/.test(imageInput.trim()) && imageInput.length > 50) {
          console.log(`[BG-REMOVE] Processing raw base64 string`);
          buffer = Buffer.from(imageInput.trim(), "base64");
          mime = this.detectMimeFromBuffer(buffer) || "image/png";
          filename = `upload.${mime.split("/")[1] || "png"}`;
        } else {
          throw new Error("imageUrl must be a valid URL, data URL, or base64 string");
        }
      } else {
        throw new Error("imageUrl must be string (URL/base64) or Buffer");
      }
      const form = new FormData();
      form.append("files", buffer, {
        filename: filename,
        contentType: mime
      });
      const res = await axios.post(`${this.baseURL}/upload?upload_id=${this.uploadId}`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      console.log(`[BG-REMOVE] Uploaded: ${res.data[0]}`);
      await this.waitUploadProgress();
      return {
        path: res.data[0],
        mime: mime
      };
    } catch (err) {
      console.error(`[BG-REMOVE] Upload failed:`, err.message);
      throw err;
    }
  }
  detectMimeFromBuffer(buffer) {
    const header = buffer.slice(0, 4).toString("hex").toLowerCase();
    if (header.startsWith("ffd8ffe")) return "image/jpeg";
    if (header.startsWith("89504e47")) return "image/png";
    if (header.startsWith("47494638")) return "image/gif";
    if (header.startsWith("52494646")) return "image/webp";
    return null;
  }
  waitUploadProgress() {
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${this.baseURL}/upload_progress?upload_id=${this.uploadId}`, {
        headers: this.headers
      });
      es.onmessage = e => {
        if (e.data && e.data !== "[DONE]") {
          const data = JSON.parse(e.data);
          if (data.msg === "done") {
            es.close();
            resolve();
          }
        }
      };
      es.onerror = err => {
        es.close();
        reject(err);
      };
    });
  }
  async generate({
    imageUrl
  }) {
    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }
    if (Array.isArray(imageUrl)) {
      console.warn("[BG-REMOVE] Multiple imageUrl provided, using first one.");
      imageUrl = imageUrl[0];
    }
    const {
      path,
      mime
    } = await this.upload(imageUrl);
    const imageData = {
      path: path,
      url: `${this.baseURL}/file=${path}`,
      orig_name: path.split("/").pop(),
      size: null,
      mime_type: mime,
      meta: {
        _type: "gradio.FileData"
      }
    };
    const payload = {
      data: [imageData],
      event_data: null,
      fn_index: 2,
      trigger_id: Math.floor(Math.random() * 100),
      session_hash: this.sessionHash
    };
    console.log("[BG-REMOVE] Joining queue...");
    await axios.post(`${this.baseURL}/queue/join?`, payload, {
      headers: this.headers
    });
    return await this.autoPoll();
  }
  autoPoll() {
    return new Promise((resolve, reject) => {
      console.log("[BG-REMOVE] Polling result...");
      const es = new EventSource(`${this.baseURL}/queue/data?session_hash=${this.sessionHash}`, {
        headers: this.headers
      });
      es.onmessage = e => {
        if (!e.data || e.data === "[DONE]") return;
        let data;
        try {
          data = JSON.parse(e.data);
        } catch {
          return;
        }
        console.log(`[BG-REMOVE] ${data.msg}`);
        if (data.msg === "process_completed" && data.output) {
          es.close();
          resolve(data.output);
        }
      };
      es.onerror = () => {
        es.close();
        reject(new Error("Polling failed or timeout"));
      };
      setTimeout(() => {
        es.close();
        reject(new Error("Background removal timeout (60s)"));
      }, 6e4);
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new LucaBackgroundRemove();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}