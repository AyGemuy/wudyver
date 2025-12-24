import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import * as cheerio from "cheerio";
class ImageToTextOCR {
  constructor() {
    this.baseURL = "https://imagetotext.online";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://imagetotext.online",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://imagetotext.online/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.cookies = "";
    this.csrfToken = "";
  }
  async initSession() {
    try {
      const {
        data,
        headers
      } = await axios.get(this.baseURL, {
        headers: this.headers
      });
      this.cookies = headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
      this.csrfToken = cheerio.load(data)('meta[name="csrf-token"]').attr("content") || "";
      !this.csrfToken && (() => {
        throw new Error("CSRF Token tidak ditemukan!");
      })();
    } catch (error) {
      console.error("Gagal mengambil cookie dan token:", error.message);
    }
  }
  async processImage(input, options = {}) {
    try {
      (!this.cookies || !this.csrfToken) && await this.initSession();
      const isBuffer = Buffer.isBuffer(input);
      const isBase64 = typeof input === "string" && input.startsWith("data:");
      const isUrl = typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"));
      const imageData = isBuffer ? await this.processBuffer(input, options) : isBase64 ? await this.processBase64(input) : isUrl ? await this.processUrl(input) : (() => {
        throw new Error("Unsupported input type");
      })();
      const form = new FormData();
      form.append("request[]", new Blob([imageData.buffer], {
        type: imageData.contentType
      }), imageData.filename);
      const {
        data: result
      } = await axios.post(`${this.baseURL}/save-Image`, form, {
        headers: {
          ...this.headers,
          "x-csrf-token": this.csrfToken,
          cookie: this.cookies,
          ...form.headers
        }
      });
      return result;
    } catch (error) {
      console.error("Gagal melakukan OCR:", error.message);
      return null;
    }
  }
  async processUrl(url) {
    const {
      data: fileBuffer,
      headers
    } = await axios.get(url, {
      responseType: "arraybuffer"
    });
    const ext = headers["content-type"]?.split("/")[1] || "jpg";
    return {
      buffer: Buffer.from(fileBuffer),
      contentType: headers["content-type"] || "image/jpeg",
      filename: `image.${ext}`
    };
  }
  async processBase64(base64String) {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const contentType = base64String.startsWith("data:image/png") ? "image/png" : base64String.startsWith("data:image/gif") ? "image/gif" : base64String.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    const extension = contentType.split("/")[1];
    return {
      buffer: buffer,
      contentType: contentType,
      filename: `image.${extension}`
    };
  }
  async processBuffer(buffer, options = {}) {
    return {
      buffer: buffer,
      contentType: options.contentType || "image/jpeg",
      filename: options.filename || "image.jpg"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  !params.image && res.status(400).json({
    error: "Image is required"
  });
  try {
    const ocr = new ImageToTextOCR();
    const data = await ocr.processImage(params.image, {
      contentType: params.contentType,
      filename: params.filename
    });
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}