import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import {
  v4 as uuidv4
} from "uuid";
import crypto from "crypto";
class ImageAPI {
  constructor(provider = 1) {
    this.provider = provider;
    this.baseUrls = {
      1: "https://ai-api.avaide.com/v6/sr",
      2: "https://ai-api.arkthinker.com/v6/sr"
    };
    this.baseUrl = this.baseUrls[provider] || this.baseUrls[1];
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Origin: provider === 1 ? "https://www.avaide.com" : "https://www.arkthinker.com",
      Pragma: "no-cache",
      Referer: provider === 1 ? "https://www.avaide.com/image-upscaler/" : "https://www.arkthinker.com/image-upscaler/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  generateName() {
    return `avatar-${uuidv4()}.jpg`;
  }
  generateEId() {
    return uuidv4().replace(/-/g, "");
  }
  generateSign() {
    return crypto.randomBytes(16).toString("hex");
  }
  async uploadImage(imageUrl) {
    try {
      const imageBuffer = await this.getImageBuffer(imageUrl);
      const form = new FormData();
      const blob = new Blob([imageBuffer], {
        type: "image/jpeg"
      });
      const name = this.generateName();
      const e_id = this.generateEId();
      form.append("img", blob, "blob");
      form.append("sign", this.generateSign());
      form.append("name", name);
      const response = await axios.post(`${this.baseUrl}/upload`, form, {
        headers: {
          ...this.headers
        }
      });
      return this.handleUploadResponse(response.data, e_id);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }
  handleUploadResponse(responseData, e_id) {
    if (responseData.status === "200") {
      return {
        message: responseData.message,
        status: responseData.status,
        token: responseData.token,
        e_id: e_id
      };
    } else {
      throw new Error("Upload failed: " + responseData.message);
    }
  }
  async getImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  async sendData(token, scale, e_id) {
    try {
      const form = new FormData();
      form.append("token", token);
      form.append("scale", scale);
      form.append("e_id", e_id);
      const response = await axios.post(`${this.baseUrl}/sr`, form, {
        headers: {
          ...this.headers
        }
      });
      return this.handleSRResponse(response.data);
    } catch (error) {
      console.error("Error sending data:", error);
      throw error;
    }
  }
  handleSRResponse(responseData) {
    if (responseData.status === "200") {
      return {
        key: responseData.key,
        message: responseData.message,
        status: responseData.status
      };
    } else {
      throw new Error("SR processing failed: " + responseData.message);
    }
  }
  async checkStatus(code) {
    try {
      const form = new URLSearchParams();
      form.append("code", code);
      const response = await axios.post(`${this.baseUrl}/status`, form, {
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error checking status:", error);
      throw error;
    }
  }
  async pollStatus(code, delay = 5e3) {
    let statusResponse = await this.checkStatus(code);
    while (statusResponse.status !== "200" || statusResponse.message !== "success") {
      console.log(`Status not ready. Waiting for ${delay / 1e3} seconds...`);
      await this.sleep(delay);
      statusResponse = await this.checkStatus(code);
    }
    return {
      completionTime: statusResponse.CompletionTime,
      taskId: statusResponse.task_id,
      url: statusResponse.urlV,
      message: statusResponse.message,
      status: statusResponse.status
    };
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const {
    url,
    scale = 2,
    provider = 2
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  try {
    const imageApi = new ImageAPI(provider);
    const uploadResponse = await imageApi.uploadImage(url);
    const token = uploadResponse.token;
    const e_id = uploadResponse.e_id;
    const srResponse = await imageApi.sendData(token, scale, e_id);
    const statusCode = srResponse.key;
    const statusResponse = await imageApi.pollStatus(statusCode);
    return res.status(200).json({
      result: statusResponse
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}