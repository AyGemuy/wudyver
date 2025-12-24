import axios from "axios";
import {
  EventSource
} from "eventsource";
class GradioClient {
  constructor() {
    this.baseUrl = "https://nech-c-wainsfwillustrious-v140.hf.space";
  }
  generateSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async generate(options = {}) {
    const sessionHash = this.generateSessionHash();
    const defaults = {
      model: "v140",
      prompt: "a beautiful anime landscape",
      qualityPrompt: "masterpiece, best quality, fine details",
      negativePrompt: "blurry, low quality, watermark, monochrome, text",
      seed: Math.floor(Math.random() * 2147483647),
      useQualityPrompt: true,
      width: 1024,
      height: 1024,
      guidanceScale: 6,
      steps: 30,
      generations: 1
    };
    const config = {
      ...defaults,
      ...options
    };
    if (!config.prompt) {
      return Promise.reject(new Error("Prompt harus disediakan."));
    }
    return new Promise(async (resolve, reject) => {
      try {
        const headers = {
          accept: "*/*",
          "content-type": "application/json",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`,
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        const joinPayload = {
          data: [config.model, config.prompt, config.qualityPrompt, config.negativePrompt, config.seed, config.useQualityPrompt, config.width, config.height, config.guidanceScale, config.steps, config.generations, null, true],
          event_data: null,
          fn_index: 9,
          trigger_id: 18,
          session_hash: sessionHash
        };
        await axios.post(`${this.baseUrl}/gradio_api/queue/join?`, joinPayload, {
          headers: headers
        });
        const eventSource = new EventSource(`${this.baseUrl}/gradio_api/queue/data?session_hash=${sessionHash}`);
        eventSource.onmessage = event => {
          if (!event.data) return;
          const data = JSON.parse(event.data);
          if (data.msg === "process_completed") {
            eventSource.close();
            resolve(data.output);
          } else if (data.msg === "process_starts") {
            console.log("Proses dimulai...");
          }
        };
        eventSource.onerror = error => {
          eventSource.close();
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const client = new GradioClient();
  try {
    const data = await client.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}