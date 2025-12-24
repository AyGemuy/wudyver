import axios from "axios";
import {
  FormData
} from "formdata-node";
import crypto from "crypto";
class VheerService {
  constructor() {
    this.url = "https://vheer.com/app/image-to-text";
  }
  async processImage(input, options = {}) {
    try {
      const lang = options.lang || "ENG";
      const isBuffer = Buffer.isBuffer(input);
      const isBase64 = typeof input === "string" && input.startsWith("data:");
      const isUrl = typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"));
      const imageData = isBuffer ? await this.processBuffer(input, options) : isBase64 ? await this.processBase64(input) : isUrl ? await this.processUrl(input) : (() => {
        throw new Error("Unsupported input type");
      })();
      const form = new FormData();
      form.append("1_imageBase64", imageData.base64);
      form.append("1_languageIndex", lang);
      form.append("0", `["$K1","${this.randomString(10)}"]`);
      const {
        data
      } = await axios.post(this.url, form, {
        headers: {
          accept: "text/x-component",
          "user-agent": "Mozilla/5.0",
          referer: this.url,
          "next-action": "99625e5ddd7496b07a3d1bef68618b3c0dea0807",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22app%22%2C%7B%22children%22%3A%5B%22image-to-text%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fimage-to-text%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
          ...form.headers
        },
        data: form
      });
      return JSON.parse(data.split("\n")[1].slice(2));
    } catch (error) {
      throw new Error(`Error: ${error.message}`);
    }
  }
  async processUrl(url) {
    const {
      data: fileBuffer,
      headers
    } = await axios.get(url, {
      responseType: "arraybuffer"
    });
    const contentType = headers["content-type"] || "image/jpeg";
    const base64Image = Buffer.from(fileBuffer).toString("base64");
    return {
      base64: `data:${contentType};base64,${base64Image}`,
      buffer: Buffer.from(fileBuffer),
      contentType: contentType
    };
  }
  async processBase64(base64String) {
    const buffer = base64String.startsWith("data:") ? Buffer.from(base64String.replace(/^data:image\/\w+;base64,/, ""), "base64") : Buffer.from(base64String, "base64");
    const contentType = base64String.startsWith("data:image/png") ? "image/png" : base64String.startsWith("data:image/gif") ? "image/gif" : base64String.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
    const base64Data = base64String.startsWith("data:") ? base64String : `data:${contentType};base64,${base64String}`;
    return {
      base64: base64Data,
      buffer: buffer,
      contentType: contentType
    };
  }
  async processBuffer(buffer, options = {}) {
    const contentType = options.contentType || "image/jpeg";
    const base64Image = buffer.toString("base64");
    return {
      base64: `data:${contentType};base64,${base64Image}`,
      buffer: buffer,
      contentType: contentType
    };
  }
  randomString(length) {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  !params.image && res.status(400).json({
    error: "Image is required"
  });
  try {
    const ocr = new VheerService();
    const data = await ocr.processImage(params.image, {
      lang: params.lang,
      contentType: params.contentType
    });
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}