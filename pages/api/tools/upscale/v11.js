import axios from "axios";
import WebSocket from "ws";
class PixnovaAI {
  constructor() {
    this.ws = null;
    this.sessionHash = this.generateHash();
    this.result = null;
  }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket("wss://pixnova.ai/upscale-img/queue/join", {
        headers: {
          Upgrade: "websocket",
          Origin: "https://pixnova.ai",
          "Cache-Control": "no-cache",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          Pragma: "no-cache",
          Connection: "Upgrade",
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Key": "XDz5SyUSj7SCbIgw7tuInw==",
          "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      this.ws.on("open", () => {
        console.log("[✅] WebSocket connected");
        this.ws.send(JSON.stringify({
          session_hash: this.sessionHash
        }));
        resolve();
      });
      this.ws.on("message", data => this.handleMessage(data));
      this.ws.on("error", err => reject(err));
    });
  }
  async imageToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return `data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`;
    } catch (error) {
      throw new Error("Gagal mengonversi gambar ke Base64");
    }
  }
  async sendPayload(imageUrl, customPayload = {}) {
    const base64Image = await this.imageToBase64(imageUrl);
    const defaultPayload = {
      scale: 2,
      request_from: 2
    };
    const finalPayload = {
      data: {
        source_image: base64Image,
        ...defaultPayload,
        ...customPayload
      }
    };
    this.ws.send(JSON.stringify(finalPayload));
  }
  handleMessage(data) {
    try {
      const parsedData = JSON.parse(data);
      console.log("[📩] WS Data:", parsedData);
      if (parsedData.msg === "process_completed" && parsedData.success) {
        this.result = parsedData.output.result[0];
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }
  async waitForCompletion() {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.result) {
          clearInterval(checkInterval);
          this.ws.close();
          resolve(this.result);
        }
      }, 1e3);
    });
  }
  async processImage(imageUrl, payload = {}) {
    await this.connect();
    await this.sendPayload(imageUrl, payload);
    return await this.waitForCompletion();
  }
  generateHash() {
    return Math.random().toString(36).substring(2, 15);
  }
}
export default async function handler(req, res) {
  const {
    url,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: 'Paramenter "url" diperlukan'
  });
  try {
    const pixnova = new PixnovaAI();
    const payload = {
      scale: parseFloat(params.scale) || 2,
      request_from: parseInt(params.request_from) || 2,
      ...params
    };
    const resultUrl = await pixnova.processImage(url, payload);
    return res.status(200).json({
      result: resultUrl
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}