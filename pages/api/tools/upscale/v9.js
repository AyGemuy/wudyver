import axios from "axios";
import WebSocket from "ws";
class ImageProcessor {
  constructor() {
    this.sessionHash = this.generateSessionHash();
  }
  generateSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({
      length: 12
    }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  }
  dataUriToBuffer(dataUri) {
    const base64Data = dataUri.split(",")[1];
    return Buffer.from(base64Data, "base64");
  }
  async encodeImageToBase64(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(response.data);
      return buffer.toString("base64");
    } catch (error) {
      throw error;
    }
  }
  async createPayload(base64Image, {
    version = "v1.4",
    scale = 2
  }) {
    const imageData = [`data:image/jpeg;base64,${base64Image}`, version, scale];
    return {
      hash: this.sessionHash,
      fn_index: 0,
      data: imageData
    };
  }
  monitorProgress(base64Image, {
    version,
    scale
  }) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://nightfury-image-face-upscale-restoration-gfpgan.hf.space/queue/join`);
      ws.on("open", async () => {
        console.log("Connected to WebSocket");
        const payload = await this.createPayload(base64Image, {
          version: version,
          scale: scale
        });
        ws.send(JSON.stringify({
          hash: payload.hash
        }));
        ws.send(JSON.stringify(payload));
      });
      ws.on("message", data => {
        const message = JSON.parse(data);
        if (message.msg === "process_completed") {
          const outputBase64 = this.dataUriToBuffer(message.output.data[0]);
          ws.close();
          resolve(outputBase64);
        }
      });
      ws.on("error", error => {
        console.error("WebSocket Error:", error);
        ws.close();
        reject(error);
      });
      ws.on("close", () => {
        console.log("WebSocket closed");
      });
    });
  }
  async process(url, params = {
    version: "v1.4",
    scale: 2
  }) {
    try {
      const base64Image = await this.encodeImageToBase64(url);
      const {
        version,
        scale
      } = params;
      const result = await this.monitorProgress(base64Image, {
        version: version,
        scale: scale
      });
      return result;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Image URL is required"
    });
  }
  const defaultParams = {
    version: "v1.4",
    scale: 2
  };
  try {
    const processor = new ImageProcessor();
    const result = await processor.process(url, {
      ...defaultParams,
      ...params
    });
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result));
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}