import axios from "axios";
import {
  EventSource
} from "eventsource";
class ImageGenerator {
  constructor() {
    this.baseUrl = "https://text2img.vip/api/ai-beer";
    this.imageBaseUrl = "https://text2img.vip/api/image-proxy";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://text2img.vip",
      pragma: "no-cache",
      referer: "https://text2img.vip/dashboard/playground/text2img",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    prompt = "men",
    useModel = "flux",
    useSampler = 4,
    ngPrompt = "",
    cfg = 7,
    setps = 20,
    type = "beer",
    width = 1080,
    height = 960,
    seed = 0,
    ...extra
  }) {
    try {
      const payload = {
        prompt: prompt,
        useModel: useModel,
        useSampler: useSampler,
        ngPrompt: ngPrompt,
        cfg: cfg,
        setps: setps,
        type: type,
        width: width,
        height: height,
        seed: seed,
        ...extra
      };
      const encryptedPayload = this.encrypt(JSON.stringify(payload));
      const key = this.genKey();
      const response = await axios.post(this.baseUrl, {
        text2img: encryptedPayload,
        key: key,
        userId: null
      }, {
        headers: this.headers
      });
      if (response.data.success) {
        console.log("Request accepted, polling for result...");
        return await this.pollImageStatus(key);
      } else {
        console.error("Failed to generate image");
        return null;
      }
    } catch (error) {
      console.error("Error during image generation:", error.message);
      return null;
    }
  }
  async pollImageStatus(key) {
    const url = `${this.baseUrl}?key=${key}`;
    const eventSource = new EventSource(url, {
      headers: this.headers
    });
    return new Promise((resolve, reject) => {
      eventSource.onmessage = async event => {
        const data = JSON.parse(event.data);
        console.log("Polling status:", data.status);
        if (data.status === "completed") {
          eventSource.close();
          const url = this.genUrl(data.url);
          resolve({
            url: url
          });
        }
      };
      eventSource.onerror = error => {
        console.error("Polling error:", error);
        eventSource.close();
        reject(error);
      };
    });
  }
  genUrl(imagePath) {
    return `${this.imageBaseUrl}/${imagePath}`;
  }
  encrypt(str) {
    return str.split("").reverse().map(e => String.fromCharCode(e.charCodeAt(0) + 5)).join("");
  }
  genKey(e = 24) {
    const l = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < e; i++) {
      s += l.charAt(Math.floor(Math.random() * l.length));
    }
    return s;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const generator = new ImageGenerator();
    const response = await generator.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}