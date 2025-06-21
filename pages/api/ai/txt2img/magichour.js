import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class MagicHourAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://magichour.ai/api/free-tools/v1/",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://magichour.ai",
        referer: "https://magichour.ai/products/ai-image-generator",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "x-timezone-offset": "-480"
      },
      jar: this.cookieJar,
      withCredentials: true
    }));
  }
  generateHash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }
  async generateImage(prompt, orientation = "portrait") {
    const taskId = this.generateHash(prompt + Date.now().toString());
    const payload = {
      prompt: prompt,
      orientation: orientation,
      task_id: taskId
    };
    try {
      const result = await this.client.post("ai-image-generator", payload);
      const status = await this.pollStatus(taskId);
      return status;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }
  async checkStatus(taskId) {
    try {
      const response = await this.client.get(`ai-image-generator/${taskId}/status`);
      return response.data;
    } catch (error) {
      console.error("Error checking status:", error);
      throw error;
    }
  }
  async pollStatus(taskId, interval = 5e3) {
    let status = await this.checkStatus(taskId);
    while (status.status !== "SUCCESS") {
      await new Promise(resolve => setTimeout(resolve, interval));
      status = await this.checkStatus(taskId);
    }
    return status;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    orientation
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const api = new MagicHourAPI();
  try {
    const result = await api.generateImage(prompt, orientation);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Error generating image"
    });
  }
}