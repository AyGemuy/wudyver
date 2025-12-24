import axios from "axios";
import crypto from "crypto";
import qs from "qs";
import {
  FormData
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class JollyAIRequest {
  constructor() {
    this.sessionCookie = "";
    this.csrfToken = "";
  }
  async run({
    prompt,
    ratio = "9:16",
    seed = Math.floor(Math.random() * 1e10).toString(),
    lora = [{
      model: "civitai:123456@987654",
      weight: 5
    }]
  }) {
    try {
      console.log("[1] Preflight request for CSRF token...");
      await this.getCSRFToken();
      console.log("[2] Building form data...");
      const formData = this.buildFormData({
        prompt: prompt,
        ratio: ratio,
        seed: seed,
        lora: lora
      });
      console.log("[3] Sending POST request...");
      const result = await this.sendRequest(formData);
      console.log("[4] Request completed!");
      return result;
    } catch (err) {
      console.error("Error:", err.message || err);
      throw err;
    }
  }
  async getCSRFToken() {
    try {
      console.log("[1.1] Sending OPTIONS request to get CSRF token...");
      const res = await axios({
        method: "OPTIONS",
        url: "https://jollyai.online/service/generator.php",
        headers: this.buildHeaders({
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          origin: "https://jollyai.online",
          priority: "u=1, i",
          referer: "https://jollyai.online/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        })
      });
      this.csrfToken = res.headers["x-csrf-token"] || "";
      this.sessionCookie = res.headers["set-cookie"] || [];
      console.log("CSRF Token:", this.csrfToken);
      console.log("Session Cookies:", this.sessionCookie);
    } catch (err) {
      throw new Error("Failed to retrieve CSRF token");
    }
  }
  buildFormData({
    prompt,
    ratio,
    seed,
    lora
  }) {
    const formData = new FormData();
    formData.append("action", "ai_generate_image");
    formData.append("prompt", prompt);
    formData.append("aspect_ratio", ratio);
    formData.append("seed", seed);
    formData.append("csrf_token", this.csrfToken);
    const loraString = JSON.stringify(lora);
    formData.append("lora", loraString);
    console.log("[2.1] Form data built:", {
      prompt: prompt,
      ratio: ratio,
      seed: seed,
      lora: loraString
    });
    return formData;
  }
  async sendRequest(formData) {
    try {
      console.log("[3.1] Sending POST request with headers...");
      const headers = this.buildHeaders({
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "multipart/form-data",
        cookie: this.sessionCookie.join("; "),
        origin: "https://jollyai.online",
        priority: "u=1, i",
        referer: "https://jollyai.online/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      });
      const res = await axios.post("https://jollyai.online/service/generator.php", formData, {
        headers: headers
      });
      console.log("[3.2] Response received:", res.data);
      if (res.data.success) {
        const base64Image = res.data.data.base64_image;
        console.log("Base64 Image:", base64Image);
        console.log("[5] Sending base64 image to upload...");
        const uploadResult = await this.uploadBase64Image(base64Image);
        console.log("[6] Upload completed!");
        return uploadResult;
      }
      throw new Error("Image generation failed.");
    } catch (err) {
      throw new Error("Request failed to submit: " + err.message);
    }
  }
  async uploadBase64Image(base64Image) {
    try {
      console.log("[5.1] Sending base64 image to upload endpoint...");
      const url = "https://jollyai.online/service/upload-base64.php";
      const data = qs.stringify({
        image: `data:image/png;base64,${base64Image}`
      });
      const headers = this.buildHeaders({
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/x-www-form-urlencoded",
        cookie: this.sessionCookie.join("; "),
        origin: "https://jollyai.online",
        priority: "u=1, i",
        referer: "https://jollyai.online/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      });
      const res = await axios.post(url, data, {
        headers: headers
      });
      console.log("[5.2] Upload response:", res.data);
      return res.data;
    } catch (err) {
      throw new Error("Failed to upload base64 image: " + err.message);
    }
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    return {
      "x-request-id": this.randomID(8),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ...SpoofHead(),
      ...extra
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const jollyAIRequest = new JollyAIRequest();
  try {
    const data = await jollyAIRequest.run(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}