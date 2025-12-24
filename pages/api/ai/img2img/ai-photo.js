import axios from "axios";
import FormData from "form-data";
import {
  randomUUID
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class IDPhotoUploader {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.idphotoonline.com/camera/v1",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "id-ID,id;q=0.9",
        connection: "keep-alive",
        origin: "https://www.aipassportphotos.com",
        referer: "https://www.aipassportphotos.com/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ...SpoofHead()
      }
    });
  }
  getHeaders(extraHeaders = {}) {
    return {
      ...this.api.defaults.headers.common,
      "eagleeye-sessionid": randomUUID(),
      "eagleeye-traceid": randomUUID().replace(/-/g, ""),
      "eagleeye-pappname": `ei${randomUUID().slice(0, 6)}@${randomUUID().slice(0, 8)}`,
      ...extraHeaders
    };
  }
  async getUploadSignature() {
    try {
      console.log("[INFO] Fetching upload signature...");
      const {
        data
      } = await this.api.get("/ossSignature?_model=src", {
        headers: this.getHeaders()
      });
      return data.obj;
    } catch (error) {
      console.error("[ERROR] Failed to get upload signature:", error.response?.data || error.message);
      throw new Error(`Upload signature failed: ${error.response?.data || error.message}`);
    }
  }
  async processImage({
    imageUrl,
    action = "animation3",
    water = true,
    watch = false,
    type = 1
  }) {
    try {
      const uploadInfo = await this.getUploadSignature();
      const uploadedImagePath = await this.uploadImage(imageUrl, uploadInfo);
      return await this.performMatting(uploadedImagePath, {
        action: action,
        water: water,
        watch: watch,
        type: type
      });
    } catch (error) {
      console.error("[ERROR] Process failed:", error.message);
      throw error;
    }
  }
  async uploadImage(imageUrl, {
    accessid,
    policy,
    signature,
    dir,
    host
  }) {
    try {
      console.log("[INFO] Downloading image...");
      const {
        data: imgBuffer,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const fileName = `${Date.now()}_upload.${headers["content-type"].split("/")[1]}`;
      console.log("[INFO] Uploading image...");
      const form = new FormData();
      form.append("ossaccesskeyid", accessid);
      form.append("policy", policy);
      form.append("signature", signature);
      form.append("key", `${dir}/${fileName}`);
      form.append("success_action_status", "201");
      form.append("file", imgBuffer, {
        filename: fileName,
        contentType: headers["content-type"]
      });
      await axios.post(host, form, {
        headers: this.getHeaders({
          ...form.getHeaders()
        })
      });
      const uploadedPath = `${host}/${dir}/${fileName}`;
      console.log("[SUCCESS] Image uploaded:", uploadedPath);
      return uploadedPath;
    } catch (error) {
      console.error("[ERROR] Failed to upload image:", error.response?.data || error.message);
      throw new Error(`Image upload failed: ${error.response?.data || error.message}`);
    }
  }
  async performMatting(filePath, {
    action,
    water,
    watch,
    type
  }) {
    try {
      console.log("[INFO] Processing image (matting)...");
      const url = `/matting?imgInPath=${encodeURIComponent(filePath)}&action=${action}&water=${water}&watch=${watch}&type=${type}`;
      const {
        data
      } = await this.api.get(url, {
        headers: this.getHeaders({
          apkid: "1",
          "rc-action": "AiPhoto",
          "rc-token": "your_rc_token_here"
        })
      });
      console.log("[SUCCESS] Image processed:", data);
      return data;
    } catch (error) {
      console.error("[ERROR] Failed to process matting:", error.response?.data || error.message);
      throw new Error(`Matting failed: ${error.response?.data || error.message}`);
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
  const uploader = new IDPhotoUploader();
  try {
    const data = await uploader.processImage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}