import WebSocket from "ws";
import crypto from "crypto";
import FormData from "form-data";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const CONFIG = {
  URL: "wss://34.60.29.37:8089",
  KEY: "R9fmD6eQd5THwbnJ",
  HEADERS: {
    "User-Agent": "Dart/3.7 (dart:io)",
    "Cache-Control": "no-cache",
    host: "34.60.29.37:8089"
  },
  UPLOAD_API: `https://${apiConfig.DOMAIN_URL}/api/tools/upload`
};
const MODELS = ["gpt-4o-mini", "gpt-4o", "imageGen", "gemini"];
class AskAI {
  constructor() {
    this.ws = null;
    this.isConnected = false;
  }
  log(msg, type = "INFO") {
    const time = new Date().toISOString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  uuid() {
    return crypto.randomUUID();
  }
  enc(text, ivBase64) {
    try {
      const iv = Buffer.from(ivBase64, "base64");
      const key = Buffer.from(CONFIG.KEY, "utf8");
      const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
      let encrypted = cipher.update(text, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (e) {
      this.log(`Encrypt Error: ${e.message}`, "ERR");
      return null;
    }
  }
  async _resolveImage(source) {
    if (!source) return null;
    try {
      if (Buffer.isBuffer(source)) return source.toString("base64");
      if (typeof source === "string" && (source.startsWith("http://") || source.startsWith("https://"))) {
        this.log("Fetching image from URL...");
        const res = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data).toString("base64");
      }
      if (typeof source === "string") {
        return source.replace(/^data:image\/\w+;base64,/, "");
      }
      return null;
    } catch (e) {
      this.log(`Image Processing Error: ${e.message}`, "ERR");
      throw e;
    }
  }
  async _upload(base64String) {
    try {
      this.log("Uploading generated image to host...");
      const buffer = Buffer.from(base64String, "base64");
      const form = new FormData();
      form.append("file", buffer, {
        filename: `generated-${Date.now()}.png`,
        contentType: "image/png",
        knownLength: buffer.length
      });
      const formHeaders = form.getHeaders();
      const contentLength = form.getLengthSync();
      const res = await axios.post(CONFIG.UPLOAD_API, form, {
        headers: {
          ...formHeaders,
          "Content-Length": contentLength
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      this.log(`Upload success: ${JSON.stringify(res.data)}`);
      return res.data?.result || res.data;
    } catch (e) {
      const errorMsg = e.response ? JSON.stringify(e.response.data) : e.message;
      this.log(`Upload Error: ${errorMsg}`, "ERR");
      return null;
    }
  }
  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) return resolve(this.ws);
      this.log(`Connecting to ${CONFIG.URL}...`);
      this.ws = new WebSocket(CONFIG.URL, {
        headers: CONFIG.HEADERS
      });
      this.ws.on("open", () => {
        this.isConnected = true;
        this.log("WebSocket Connected");
        resolve(this.ws);
      });
      this.ws.on("error", err => {
        this.log(`WS Error: ${err?.message}`, "ERR");
        reject(err);
      });
      this.ws.on("close", () => {
        this.isConnected = false;
        this.log("WebSocket Closed");
      });
    });
  }
  async chat({
    model = "gpt-4o-mini",
    prompt,
    image,
    messages,
    ...rest
  }) {
    const hasInput = prompt || image || messages && messages.length > 0;
    if (!hasInput) throw new Error("Validation Failed: 'prompt', 'image', or 'messages' is required.");
    if (!MODELS.includes(model)) throw new Error(`Validation Failed: Model '${model}' not found.`);
    let msgList = messages || [];
    const imageBase64 = await this._resolveImage(image);
    if (msgList.length === 0 && (prompt || imageBase64)) {
      const newMessage = {};
      if (prompt) newMessage.user = prompt;
      if (imageBase64) newMessage.image = imageBase64;
      msgList.push(newMessage);
    }
    try {
      await this.connect();
      return new Promise((resolve, reject) => {
        const iv = crypto.randomBytes(16).toString("base64");
        const user = rest.user || this.uuid();
        const dataPayload = {
          user: user,
          messages: msgList,
          model: model,
          version: rest.version || "0.0.9",
          locale: rest.locale || "id",
          iv: iv
        };
        const sign = this.enc(JSON.stringify(dataPayload), iv);
        const finalMessage = {
          data: dataPayload,
          sign: sign
        };
        this.log(`Sending Payload (Model: ${model})...`);
        this.ws.send(JSON.stringify(finalMessage));
        let resultText = "";
        let resultImage = null;
        let metaInfo = {
          predicts: null,
          model: model
        };
        const handleMsg = async data => {
          try {
            const parsed = JSON.parse(data.toString());
            const status = parsed?.status;
            if (status === "active") {
              if (parsed.message) {
                process.stdout.write(parsed.message);
                resultText += parsed.message;
              }
              if (parsed.image) {
                this.log(`Receiving Image Data...`);
                resultImage = parsed.image;
              }
              if (parsed.predict) {
                try {
                  const pred = typeof parsed.predict === "string" ? JSON.parse(parsed.predict) : parsed.predict;
                  metaInfo.predicts = pred?.predicts || pred;
                  console.log();
                  this.log(`Prediction: ${JSON.stringify(metaInfo.predicts)}`);
                } catch (e) {}
              }
            } else if (status === "close") {
              this.log("Session finished.");
              this.ws.off("message", handleMsg);
              let finalResult = resultImage || resultText;
              const type = resultImage ? "image" : "text";
              if (type === "image" && resultImage) {
                const uploadData = await this._upload(resultImage);
                if (uploadData) finalResult = uploadData;
              }
              resolve({
                result: finalResult,
                type: type,
                info: metaInfo
              });
            }
          } catch (err) {
            this.log(`Parse Error: ${err.message}`, "ERR");
          }
        };
        this.ws.on("message", handleMsg);
      });
    } catch (e) {
      this.log(`Generate Error: ${e.message}`, "ERR");
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AskAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}