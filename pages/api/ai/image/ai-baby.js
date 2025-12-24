import CryptoJS from "crypto-js";
import axios from "axios";
import WebSocket from "ws";
const GSE_KEY = "1H5tRtzsBkqXcaJ";
const APP_ID = "aifaceswap";
const DEVICE_ID = "817ddfb1-ea6c-4e07-b37d-3aa9281e4fb7";
class PixnovaBabyGenerator {
  constructor() {
    this.appId = APP_ID;
    this.deviceId = DEVICE_ID;
    this.gseKey = GSE_KEY;
  }
  generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
  aesEncrypt(plainText, key, iv) {
    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plainText), CryptoJS.enc.Utf8.parse(key), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  }
  aesEncryptSimple(value, secret) {
    return this.aesEncrypt(`${this.appId}:${value}`, secret, secret);
  }
  generateSignData() {
    const now = new Date();
    const utcDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    const timestamp = Math.floor(utcDate.getTime() / 1e3);
    const nonce = this.generateRandomString(16);
    const aesSecret = this.generateRandomString(16);
    return {
      timestamp: timestamp,
      nonce: nonce,
      aesSecret: aesSecret,
      encryptedSecretKey: aesSecret
    };
  }
  async generateSignature() {
    const {
      timestamp,
      nonce,
      aesSecret,
      encryptedSecretKey
    } = this.generateSignData();
    const dataToSign = `${this.appId}:${this.gseKey}:${timestamp}:${nonce}:${encryptedSecretKey}`;
    const sign = this.aesEncrypt(dataToSign, aesSecret, aesSecret);
    return {
      app_id: this.appId,
      t: timestamp,
      nonce: nonce,
      sign: sign,
      secret_key: encryptedSecretKey,
      aesSecret: aesSecret
    };
  }
  async fetchBase64FromUrl(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return `data:image/png;base64,${Buffer.from(response.data, "binary").toString("base64")}`;
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  async normalizeImage(input) {
    try {
      if (Buffer.isBuffer(input)) {
        return `data:image/png;base64,${input.toString("base64")}`;
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          return await this.fetchBase64FromUrl(input);
        }
        if (input.startsWith("data:image/")) {
          return input;
        }
      }
      throw new Error("Unsupported image input type.");
    } catch (error) {
      console.error("Error normalizing image:", error);
      throw error;
    }
  }
  async generate({
    father,
    mother,
    gender
  }) {
    let ws;
    try {
      const signatureData = await this.generateSignature();
      const fp1 = this.aesEncryptSimple(this.deviceId, signatureData.aesSecret);
      const wsUrl = `wss://pixnova.ai/demo-ai-baby/queue/join?fp=${this.deviceId}&fp1=${fp1}&x-guide=${signatureData.secret_key}`;
      const fatherBase64 = await this.normalizeImage(father);
      const motherBase64 = await this.normalizeImage(mother);
      return new Promise((resolve, reject) => {
        try {
          ws = new WebSocket(wsUrl, {
            headers: {
              Origin: "https://pixnova.ai",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0"
            }
          });
          ws.on("open", () => console.log("WS connected"));
          ws.on("message", data => {
            try {
              const parsed = JSON.parse(data.toString());
              if (parsed.msg === "send_hash") ws.send(JSON.stringify({
                session_hash: this.generateRandomString(12)
              }));
              if (parsed.msg === "send_data") ws.send(JSON.stringify({
                data: {
                  gender: gender,
                  father_image: fatherBase64,
                  mother_image: motherBase64,
                  request_from: 2
                }
              }));
              if (parsed.msg === "process_completed") {
                ws.close();
                parsed.success ? resolve(`https://oss-global.pixnova.ai/${parsed.output.result[0]}`) : reject(new Error(`Pixnova Baby process failed: ${parsed.error}`));
              }
            } catch (err) {
              console.error("WS message error:", err);
              reject(err);
              if (ws?.readyState === WebSocket.OPEN) ws.close();
            }
          });
          ws.on("error", err => {
            console.error("WS error:", err);
            reject(err);
          });
          ws.on("close", () => console.log("WS closed"));
        } catch (err) {
          console.error("WS connection error:", err);
          reject(err);
        }
      });
    } catch (error) {
      console.error("Generate error:", error);
      if (ws?.readyState === WebSocket.OPEN) ws.close();
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.father) return res.status(400).json({
    error: "father required"
  });
  if (!params.mother) return res.status(400).json({
    error: "mother required"
  });
  if (!params.gender) return res.status(400).json({
    error: "gender required"
  });
  try {
    const babyGenerator = new PixnovaBabyGenerator();
    const result = await babyGenerator.generate(params);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}