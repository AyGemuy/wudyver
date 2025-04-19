import axios from "axios";
import crypto from "crypto";
class GizAI {
  constructor() {
    this.apiURL = "https://app.giz.ai/api/data/users/inferenceServer.infer";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  generateId(length = 21) {
    return crypto.randomBytes(length).toString("base64").replace(/[+/]/g, "-").slice(0, length);
  }
  getRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }
  async sendRequest(action, params) {
    const instanceId = this.generateId();
    const subscribeId = this.generateId();
    const xForwardedFor = this.getRandomIP();
    let requestBody;
    switch (action) {
      case "image":
        requestBody = {
          model: "image-generation",
          baseModel: params.baseModel || "flux1",
          input: {
            settings: {
              character: "AI",
              responseMode: "text",
              voice: "tts-1:onyx",
              ttsSpeed: "1",
              imageModel: "sdxl"
            },
            prompt: params.prompt,
            width: params.width || "1280",
            height: params.height || "720",
            batch_size: params.batchSize || "1",
            style: params.style || "undefined",
            checkpoint: "shuttle-jaguar-fp8.safetensors",
            steps: 4,
            growMask: 30,
            face_detailer: false,
            upscale: params.upscale || false,
            mode: "image-generation"
          },
          subscribeId: subscribeId,
          instanceId: instanceId
        };
        break;
      case "chat":
        requestBody = {
          model: "gemini-2.0-flash-lite",
          input: {
            messages: [{
              type: "human",
              content: params.prompt
            }],
            mode: "plan"
          },
          noStream: true
        };
        break;
      default:
        throw new Error("Invalid action type");
    }
    try {
      const response = await axios.post(this.apiURL, requestBody, {
        headers: {
          ...this.headers,
          "x-forwarded-for": xForwardedFor
        },
        timeout: 15e3
      });
      return response.data;
    } catch (error) {
      console.error(`Gagal pada ${action}:`, error.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const gizAI = new GizAI();
  try {
    const data = await gizAI.sendRequest(action, params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during request"
    });
  }
}