import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
class NanoBananaAI {
  constructor(options = {}) {
    this.log = options.log ?? true;
    this.baseURL = "https://www.nanobanan.ai/api";
    this.uploadURL = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://www.nanobanan.ai",
        priority: "u=1, i",
        referer: "https://www.nanobanan.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.cookies = {};
    this._updateHeaders();
  }
  _log(msg) {
    this.log && console.log(`[NanoBananaAI] ${msg}`);
  }
  _updateHeaders() {
    const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    this.api.defaults.headers.common["cookie"] = cookieStr;
  }
  async _getImageDetails(imgInput) {
    let buffer, mime = "image/jpeg";
    if (Buffer.isBuffer(imgInput)) {
      buffer = imgInput;
      this._log("Input is a buffer. Using default content type.");
    } else if (typeof imgInput === "string") {
      if (imgInput.startsWith("http")) {
        this._log(`Downloading image from URL...`);
        const response = await axios.get(imgInput, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
          }
        });
        buffer = Buffer.from(response.data);
        mime = response.headers["content-type"] || mime;
      } else if (imgInput.startsWith("data:")) {
        const parts = imgInput.match(/^data:(.+);base64,(.+)$/);
        if (!parts) throw new Error("Invalid base64 string format");
        mime = parts[1];
        buffer = Buffer.from(parts[2], "base64");
      } else {
        throw new Error("Invalid string format. Must be a URL or a base64 string.");
      }
    } else {
      throw new Error("Unsupported input type. Must be a Buffer, URL, or base64 string.");
    }
    const mimeToExt = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };
    const extension = mimeToExt[mime] || "jpg";
    const filename = `${crypto.randomBytes(16).toString("hex")}.${extension}`;
    return {
      buffer: buffer,
      mime: mime,
      filename: filename
    };
  }
  async _uploadToWudySoft(buffer, filename, contentType) {
    this._log(`Uploading ${filename}...`);
    try {
      const formData = new FormData();
      formData.append("file", buffer, {
        filename: filename,
        contentType: contentType
      });
      const response = await axios.post(this.uploadURL, formData, {
        headers: {
          ...formData.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      this._log("Upload successful");
      return response.data;
    } catch (err) {
      console.error("Upload error:", err.response?.data || err.message);
      throw new Error("Upload to wudysoft failed");
    }
  }
  async generate({
    imageUrl,
    prompt,
    upload = true,
    ...options
  }) {
    if (!prompt) throw new Error("prompt is required");
    try {
      let response;
      if (imageUrl) {
        this._log(`Editing with prompt: "${prompt}"`);
        const formData = new FormData();
        formData.append("prompt", prompt);
        const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        this._log(`Processing ${imageUrls.length} image(s)...`);
        for (const url of imageUrls) {
          const {
            buffer: imgBuffer,
            mime: contentType,
            filename
          } = await this._getImageDetails(url);
          formData.append("images", imgBuffer, {
            filename: filename,
            contentType: contentType
          });
        }
        Object.entries(options).forEach(([k, v]) => {
          if (v !== undefined) formData.append(k, v);
        });
        response = await this.api.post("/nano-banana/edit", formData, {
          headers: {
            ...formData.getHeaders()
          },
          responseType: "arraybuffer"
        });
        this._log("Edit successful");
      } else {
        this._log(`Generating with prompt: "${prompt}"`);
        response = await this.api.post("/nano-banana/generate", {
          prompt: prompt
        }, {
          headers: {
            "content-type": "application/json"
          },
          responseType: "arraybuffer"
        });
        this._log("Generate successful");
      }
      if (upload && response.data) {
        const resultBuffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
        if (resultBuffer.length === 0) {
          throw new Error("Received empty response from API.");
        }
        const resultMime = response.headers["content-type"] || "image/jpeg";
        const mimeToExt = {
          "image/jpeg": "jpg",
          "image/png": "png"
        };
        const resultExt = mimeToExt[resultMime] || "jpg";
        const resultFilename = `result-${crypto.randomBytes(12).toString("hex")}.${resultExt}`;
        const uploadResult = await this._uploadToWudySoft(resultBuffer, resultFilename, resultMime);
        return uploadResult;
      } else if (response.data) {
        return Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.toString() || err.message;
      console.error("API error:", errorMessage);
      throw new Error(errorMessage);
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
  const api = new NanoBananaAI();
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