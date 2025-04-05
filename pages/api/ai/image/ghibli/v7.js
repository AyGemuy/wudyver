import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";

function randomCryptoIP() {
  const bytes = crypto.randomBytes(4);
  return Array.from(bytes).map(b => b % 256).join(".");
}

function randomID(length = 16) {
  return crypto.randomBytes(length).toString("hex");
}

function buildHeaders(token = "", extra = {}) {
  const ip = randomCryptoIP();
  return {
    authorization: token,
    origin: "https://www.myimg.ai",
    referer: "https://www.myimg.ai/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "x-forwarded-for": ip,
    "x-real-ip": ip,
    "x-request-id": randomID(8),
    ...extra
  };
}
class MyImgUploader {
  constructor() {
    this.baseUrl = "https://ai.amiai.club";
    this.token = "";
  }
  async loginAsGuest() {
    try {
      console.log("Logging in as guest...");
      const res = await axios.post(`${this.baseUrl}/api/account/login`, {
        platform: "guest"
      }, {
        headers: {
          "content-type": "application/json",
          ...buildHeaders()
        },
        withCredentials: true
      });
      this.token = res.data?.result?.token || "";
      console.log("Guest token obtained:", this.token);
    } catch (err) {
      console.error("Login failed:", err.message);
      throw err;
    }
  }
  async uploadImage(url, filename = "image.png") {
    try {
      console.log("Uploading image...");
      await this.loginAsGuest();
      const {
        data: buffer,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/png";
      const form = new FormData();
      form.set("file", new Blob([buffer], {
        type: contentType
      }), filename);
      const res = await axios.post(`${this.baseUrl}/api/upload?action_type=image_image_to_image`, form, {
        headers: {
          ...form.headers,
          ...buildHeaders(this.token)
        }
      });
      const result = res.data?.result;
      console.log("Image uploaded, result URL:", result);
      return result;
    } catch (err) {
      console.error("Upload image failed:", err.message);
      throw err;
    }
  }
  async transformImage(imageUrl, style, width = 576, height = 1024) {
    try {
      console.log("Transforming image...");
      const res = await axios.post(`${this.baseUrl}/api/image/image-to-image`, {
        imageUrl: imageUrl,
        style: style,
        width: width,
        height: height,
        website: "myimg"
      }, {
        headers: {
          "content-type": "application/json",
          ...buildHeaders(this.token)
        }
      });
      const actionId = res.data?.actionId;
      if (!actionId) throw new Error("Action ID tidak ditemukan");
      console.log("Image transformation started, Action ID:", actionId);
      return actionId;
    } catch (err) {
      console.error("Image transformation failed:", err.message);
      throw err;
    }
  }
  async pollResult(actionId) {
    const url = `${this.baseUrl}/api/action/info?action_id=${actionId}&website=myimg`;
    try {
      console.log("Polling result...");
      while (true) {
        const res = await axios.get(url, {
          headers: buildHeaders(this.token)
        });
        const resultUrl = JSON.parse(res.data?.result?.response || "{}")?.resultUrl;
        if (resultUrl) {
          console.log("Result found:", resultUrl);
          return resultUrl;
        }
        console.log("Waiting for result...");
        await new Promise(r => setTimeout(r, 3e3));
      }
    } catch (err) {
      console.error("Polling failed:", err.message);
      throw err;
    }
  }
  async processImageFlow({
    imageUrl: imageLink,
    style,
    width,
    height
  }) {
    try {
      console.log("Starting image processing flow...");
      const uploadedUrl = await this.uploadImage(imageLink);
      const actionId = await this.transformImage(uploadedUrl, style, width, height);
      const finalImage = await this.pollResult(actionId);
      console.log("Image processing completed.");
      return {
        url: finalImage
      };
    } catch (err) {
      console.error("Image processing failed:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const uploader = new MyImgUploader();
  try {
    const data = await uploader.processImageFlow(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}