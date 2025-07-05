import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
class AIUploader {
  constructor() {
    this.baseURL = "https://ai-api.free-videoconverter.net/v4/sr";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Origin: "https://www.free-videoconverter.net",
      Referer: "https://www.free-videoconverter.net/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }
  }
  async uploadImage(imageBuffer, fileName = this.generateName()) {
    try {
      const formData = new FormData();
      formData.append("img", new Blob([imageBuffer], {
        type: "image/jpeg"
      }), fileName);
      formData.append("sign", this.generateSign());
      formData.append("name", fileName);
      const response = await axios.post(`${this.baseURL}/upload`, formData, {
        headers: {
          ...this.headers
        }
      });
      if (response.data.status === "200") {
        return response.data.token;
      } else {
        throw new Error("Failed to upload image");
      }
    } catch (error) {
      throw new Error(`Upload error: ${error.message}`);
    }
  }
  async upscaleImage(imgMd5, scale = 2) {
    try {
      const formData = new FormData();
      formData.append("imgmd5", imgMd5);
      formData.append("scale", scale);
      formData.append("sign", this.generateSign());
      const response = await axios.post(`${this.baseURL}/sr`, formData, {
        headers: {
          ...this.headers
        }
      });
      if (response.data.status === "200") {
        return response.data.key;
      } else {
        throw new Error("Failed to upscale image");
      }
    } catch (error) {
      throw new Error(`Upscale error: ${error.message}`);
    }
  }
  async checkStatus(taskId, retries = 5, interval = 2e3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.post(`${this.baseURL}/status`, `code=${taskId}`, {
          headers: {
            ...this.headers
          }
        });
        if (response.data.status === "200" && response.data.url) {
          return response.data.url;
        }
      } catch (error) {
        console.error(`Status check error (attempt ${i + 1}): ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Image processing timed out");
  }
  generateSign() {
    return crypto.randomBytes(16).toString("hex");
  }
  generateName() {
    return `avatar-${uuidv4()}.jpg`;
  }
}
async function processImage({
  url,
  scale = 2
}) {
  const aiUploader = new AIUploader();
  try {
    const imageBuffer = await aiUploader.fetchImageBuffer(url);
    const imgMd5 = await aiUploader.uploadImage(imageBuffer);
    const taskId = await aiUploader.upscaleImage(imgMd5, scale);
    const processedImageUrl = await aiUploader.checkStatus(taskId);
    return processedImageUrl;
  } catch (error) {
    throw new Error(error.message);
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      scale = 2
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "Missing required parameters: url or scale"
      });
    }
    const result = await processImage({
      url: url,
      scale: scale
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}