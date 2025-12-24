import axios from "axios";
import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
class BeagoAI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.beago.ai",
      headers: {
        "accept-language": "id-ID,id;q=0.9",
        "app-name": "beago",
        "content-type": "application/json",
        "from-popai": "false",
        origin: "https://www.beago.ai",
        pragma: "no-cache",
        "cache-control": "no-cache",
        referer: "https://www.beago.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.deviceId = uuidv4();
    this.token = "";
    this.initialized = false;
  }
  encrypt(text) {
    const key = Buffer.from("aMszzVMpgdB1x4KB", "utf8");
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("base64");
  }
  async init() {
    try {
      const deviceToken = this.encrypt(this.deviceId);
      const res = await this.api.post("/v2/user/login", {
        authType: "DEVICE",
        deviceToken: deviceToken
      }, {
        headers: {
          authorization: "",
          h_deviceid: this.deviceId,
          baggage: `h_deviceid=${this.deviceId},from-popai=false,h_os=web,h_language=zh-Hans-CN,h_appname=beago,h_localtime=${Date.now()}`,
          starttime: Date.now().toString()
        }
      });
      if (res.data?.code === 0) {
        this.token = res.data.data.token;
        this.initialized = true;
      }
    } catch (e) {
      console.log("Login error:", e.message);
    }
  }
  async chat({
    prompt = "",
    messages = []
  }) {
    try {
      if (!this.initialized) await this.init();
      if (!this.token) return {
        error: "Failed to login"
      };
      const finalMessages = messages.length ? messages : [{
        role: "user",
        content: prompt
      }];
      const res = await this.api.post("/v1/chat/completions", {
        messages: finalMessages,
        postId: null,
        chatType: "SEARCH_INPUT"
      }, {
        headers: {
          authorization: this.token,
          h_deviceid: this.deviceId,
          baggage: `h_deviceid=${this.deviceId},from-popai=false,h_os=web,h_language=zh-Hans-CN,h_appname=beago,h_localtime=${Date.now()}`
        }
      });
      const lines = res.data?.split?.("\n") || [];
      const result = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5)).filter(data => data && data !== "[DONE]").map(data => {
        try {
          return JSON.parse(data)?.data?.choices?.[0]?.message?.content || "";
        } catch {
          return "";
        }
      }).join("");
      return {
        result: result
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
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
    const ai = new BeagoAI();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}