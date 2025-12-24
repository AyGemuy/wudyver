import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";
class OCR {
  constructor(apiKey = "4qlkYrXJ4Z255nLU35mnq84sr1VmMs9j1su18xlK") {
    this.apiKey = apiKey;
    this.baseURL = "https://nmwe4beyw1.execute-api.us-east-1.amazonaws.com/dev/recognize/";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "multipart/form-data",
      origin: "https://www.pen-to-print.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.pen-to-print.com/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-api-key": this.apiKey
    };
  }
  generateSession() {
    return crypto.randomUUID();
  }
  async generateHash(buffer) {
    const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array);
    const hashArray = Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, "0")).join("");
    let srcHash = "";
    for (let i = 0; i < 10; i++) {
      srcHash += hashArray[3 + 3 * i];
    }
    return srcHash;
  }
  async processImage(input, options = {}) {
    try {
      const isBuffer = Buffer.isBuffer(input);
      const isBase64 = typeof input === "string" && input.startsWith("data:");
      const isUrl = typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"));
      let imageData;
      if (isBuffer) {
        imageData = await this.processBuffer(input, options);
      } else if (isBase64) {
        imageData = await this.processBase64(input);
      } else if (isUrl) {
        imageData = await this.processUrl(input);
      } else {
        throw new Error("Unsupported input type. Expected Buffer, base64 string, or URL");
      }
      const session = this.generateSession();
      const srcHash = await this.generateHash(imageData.buffer);
      const form = new FormData();
      form.append("srcImg", new Blob([imageData.buffer], {
        type: imageData.contentType
      }), imageData.filename);
      form.append("srcHash", srcHash);
      form.append("includeSubScan", "1");
      form.append("userId", "undefined");
      form.append("session", session);
      form.append("appVersion", "1.0");
      let response;
      let maxRetries = 30;
      let retryCount = 0;
      while (retryCount < maxRetries) {
        response = await axios.post(this.baseURL, form, {
          headers: {
            ...this.headers,
            ...form.getHeaders()
          }
        });
        if (response.data.result === "1") {
          break;
        }
        console.log(`Menunggu hasil OCR... (time: ${response.data.time}s, attempt: ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2e3));
        retryCount++;
      }
      if (retryCount >= maxRetries) {
        throw new Error("OCR processing timeout. Maximum retry attempts reached.");
      }
      return response.data;
    } catch (error) {
      throw new Error(`Error recognizing image: ${error.message}`);
    }
  }
  async processUrl(url) {
    try {
      const {
        data: fileBuffer,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/jpeg";
      const ext = contentType.split("/")[1] || "jpg";
      return {
        buffer: Buffer.from(fileBuffer),
        contentType: contentType,
        filename: `file.${ext}`
      };
    } catch (error) {
      throw new Error(`Failed to fetch image from URL: ${error.message}`);
    }
  }
  async processBase64(base64String) {
    try {
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      let contentType = "image/jpeg";
      if (base64String.startsWith("data:image/png")) {
        contentType = "image/png";
      } else if (base64String.startsWith("data:image/gif")) {
        contentType = "image/gif";
      } else if (base64String.startsWith("data:image/webp")) {
        contentType = "image/webp";
      } else if (base64String.startsWith("data:image/jpg")) {
        contentType = "image/jpeg";
      }
      const extension = contentType.split("/")[1];
      return {
        buffer: buffer,
        contentType: contentType,
        filename: `file.${extension}`
      };
    } catch (error) {
      throw new Error(`Failed to process base64 image: ${error.message}`);
    }
  }
  async processBuffer(buffer, options = {}) {
    return {
      buffer: buffer,
      contentType: options.contentType || "image/jpeg",
      filename: options.filename || "file.jpg"
    };
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.image) {
      return res.status(400).json({
        error: "Image parameter is required",
        message: "Please provide an image URL, base64 string, or buffer"
      });
    }
    const ocr = new OCR();
    const data = await ocr.processImage(params.image, {
      contentType: params.contentType,
      filename: params.filename
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error("OCR Handler Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}