import {
  fileTypeFromBuffer
} from "file-type";
import {
  FormData,
  Blob
} from "formdata-node";
import fetch from "node-fetch";
class ImgLarger {
  constructor() {
    this.baseURL = "https://get1.imglarger.com/api/Upscaler";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      Origin: "https://imgupscaler.com",
      Referer: "https://imgupscaler.com/",
      "User-Agent": "Postify/1.0.0",
      "X-Forwarded-For": new Array(4).fill(0).map(() => Math.floor(Math.random() * 256)).join(".")
    };
  }
  async uploadImage(input, scaleRadio = 2, isLogin = 0) {
    const formData = new FormData();
    if (typeof input === "string") {
      const response = await fetch(input);
      if (!response.ok) throw new Error("Failed to fetch image from URL");
      const buffer = await response.arrayBuffer();
      const blob = new Blob([buffer], {
        type: response.headers.get("content-type") ?? "image/jpeg"
      });
      formData.append("myfile", blob, {
        filename: "uploaded_image.jpg"
      });
    } else if (Buffer.isBuffer(input)) {
      const fileType = await fileTypeFromBuffer(input);
      const mimeType = fileType?.mime ?? "application/octet-stream";
      const blob = new Blob([input], {
        type: mimeType
      });
      formData.append("myfile", blob, {
        filename: "uploaded_image.jpg"
      });
    } else {
      throw new Error("Invalid input. Provide a valid image buffer or URL.");
    }
    formData.append("scaleRadio", scaleRadio);
    formData.append("isLogin", isLogin);
    const response = await fetch(`${this.baseURL}/Upload`, {
      method: "POST",
      headers: {
        ...this.headers
      },
      body: formData
    });
    if (!response.ok) throw new Error("Failed to upload image.");
    const result = await response.json();
    if (result.code === 999) throw new Error("Authorization denied. Limit exceeded.");
    return result;
  }
  async checkStatus(uploadResponse, scaleRadio, isLogin) {
    const code = uploadResponse.data?.code ?? "";
    const response = await fetch(`${this.baseURL}/CheckStatus`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: code,
        scaleRadio: scaleRadio,
        isLogin: isLogin
      })
    });
    if (!response.ok) throw new Error("Failed to check status.");
    return response.json();
  }
  async processImage(input, scaleRadio = 2, isLogin = 0) {
    if (scaleRadio < 2 || scaleRadio > 4) throw new Error("scaleRadio must be between 2 and 4.");
    const uploadResponse = await this.uploadImage(input, scaleRadio, isLogin);
    let status;
    do {
      status = await this.checkStatus(uploadResponse, scaleRadio, isLogin);
      if (status.data?.status === "waiting") await this.delay(5e3);
    } while (status.data?.status === "waiting");
    return status;
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const imgLarger = new ImgLarger();
  try {
    const {
      input,
      scaleRadio = 2,
      isLogin = 0
    } = req.method === "POST" ? req.body : req.query;
    if (!input) return res.status(400).json({
      error: "Input parameter is required."
    });
    const result = await imgLarger.processImage(input, Number(scaleRadio), Number(isLogin));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}