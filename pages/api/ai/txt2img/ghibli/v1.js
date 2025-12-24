import axios from "axios";
import {
  EventSource
} from "eventsource";
import crypto from "crypto";
class GhibliControl {
  constructor() {
    this.baseUrl = "https://artificialguybr-studio-ghibli-lora-sdxl.hf.space";
    this.sessionHash = this.randomID(12);
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 12) {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    return {
      origin: "https://artificialguybr-studio-ghibli-lora-sdxl.hf.space",
      referer: "https://artificialguybr-studio-ghibli-lora-sdxl.hf.space/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      priority: "u=1, i",
      ...extra
    };
  }
  async generate({
    prompt
  }) {
    try {
      console.log("Starting the process...");
      const joinResponse = await this.joinQueue(prompt);
      console.log("Queue joined:", joinResponse);
      const taskStatus = await this.getTaskStatus();
      console.log("Task status:", taskStatus);
      return taskStatus;
    } catch (error) {
      console.error("Error in generating:", error);
      throw new Error(`Error in generating: ${error.message}`);
    }
  }
  async joinQueue(data) {
    try {
      const response = await axios.post(`${this.baseUrl}/queue/join?`, {
        data: [data],
        event_data: null,
        fn_index: 0,
        trigger_id: 11,
        session_hash: this.sessionHash
      }, {
        headers: this.buildHeaders()
      });
      return response.data;
    } catch (error) {
      console.error("Error joining queue:", error);
      throw new Error(`Error joining queue: ${error.message}`);
    }
  }
  async getTaskStatus() {
    return new Promise((resolve, reject) => {
      const source = new EventSource(`${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`);
      source.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.msg === "process_completed") {
          console.log("[getTaskStatus] Process completed");
          resolve(data);
          source.close();
        }
      };
      source.onerror = error => {
        console.error("[getTaskStatus] Error:", error);
        reject(error);
        source.close();
      };
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const ghibli = new GhibliControl();
  try {
    const data = await ghibli.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}