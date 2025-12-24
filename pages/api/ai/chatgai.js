import fetch from "node-fetch";
import {
  createHash,
  createCipheriv,
  randomBytes
} from "crypto";
class ChatAPI {
  constructor() {
    this.baseURL = "https://api.chatgai.fun";
    this.AES_KEY_STRING = "Ka7Ya98107EdGXQa";
    this.AES_IV_STRING = "yc0q2icx1oq4lijm";
    this.SHA1_MAGIC_STRING = "t6KeG6aKR5pm65oWn5aqS6LWE57O757ufS2V2aW4uWWFuZw";
    this.deviceID = null;
    this._userCreated = false;
    this.defaultParams = {
      version: "2.6.6",
      aiVersion: "BOLATU:grok-4-fast-reasoning",
      language: "id",
      conversationId: "",
      needSearch: 0,
      type: "1",
      bundle: "com.aichatmaster.chat.gp"
    };
  }
  _generateUUID() {
    try {
      const b = randomBytes(16);
      b[6] = b[6] & 15 | 64;
      b[8] = b[8] & 63 | 128;
      return b.toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    } catch (e) {
      console.error(`[ERROR] Generate UUID: ${e.message}`);
      throw e;
    }
  }
  _randomStr() {
    const chars = "qwertyuiopasdfghjklzxcvbnmQAZXSWEDCVFRTGBNHYUJMKIOLP1234567890";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  _aesEncrypt(str) {
    try {
      const key = Buffer.from(this.AES_KEY_STRING, "utf8");
      const iv = Buffer.from(this.AES_IV_STRING, "utf8");
      const cipher = createCipheriv("aes-128-cbc", key, iv);
      let enc = cipher.update(str, "utf8", "hex");
      enc += cipher.final("hex");
      return enc.toUpperCase();
    } catch (e) {
      console.error(`[ERROR] AES encrypt: ${e.message}`);
      throw e;
    }
  }
  _genSecurity(params) {
    try {
      const nonce = this._randomStr();
      const timestamp = Math.floor(Date.now() / 1e3);
      const payload = {
        ...this.defaultParams,
        ...params,
        deviceMac: this.deviceID,
        nonce: nonce,
        timestamp: timestamp
      };
      const signKeys = ["aiVersion", "bundle", "conversationId", "deviceMac", "nonce", "question", "timestamp", "version"];
      const signStr = signKeys.map(k => `${k}=${payload[k] || ""}`).join("&") + this.SHA1_MAGIC_STRING;
      const signature = createHash("sha1").update(signStr, "utf8").digest("hex").toLowerCase();
      payload.signature = signature;
      const json = JSON.stringify(payload);
      const encrypted = this._aesEncrypt(json);
      return encrypted;
    } catch (e) {
      console.error(`[ERROR] Generate security: ${e.message}`);
      throw e;
    }
  }
  async _createUser() {
    if (this._userCreated && this.deviceID) return;
    try {
      const deviceMac = this._generateUUID();
      console.log(`[LOG] Creating user with deviceMac: ${deviceMac}`);
      const response = await fetch(`${this.baseURL}/mb/createNewUser`, {
        method: "POST",
        headers: {
          "User-Agent": "Dart/3.6 (dart:io)",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deviceMac: deviceMac,
          bundleId: this.defaultParams.bundle,
          bundleVersion: this.defaultParams.version
        })
      });
      const text = await response.text();
      console.log(`[LOG] CreateUser response: ${text}`);
      if (response.ok) {
        const jsonResponse = JSON.parse(text);
        if (jsonResponse.code === 200 || jsonResponse.code === 400 && jsonResponse.msg === "User already exists") {
          this.deviceID = deviceMac;
          this._userCreated = true;
          console.log(`[LOG] User registered successfully: ${this.deviceID}`);
        } else {
          throw new Error(`CreateUser failed: ${text}`);
        }
      } else {
        throw new Error(`HTTP ${response.status} - CreateUser failed: ${text}`);
      }
    } catch (e) {
      console.error(`[ERROR] CreateUser: ${e.message}`);
      throw e;
    }
  }
  async model({
    language = "id"
  } = {}) {
    console.log(`\n========== MODEL FETCH START ==========`);
    try {
      const url = `${this.baseURL}/model/modelConfig?language=${language}`;
      console.log(`[LOG] GET ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Dart/3.6 (dart:io)",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json"
        }
      });
      const text = await response.text();
      console.log(`[LOG] Raw response: ${text}`);
      if (!response.ok) {
        return {
          status: "Error",
          error: `HTTP ${response.status}`,
          raw: text
        };
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        return {
          status: "Error",
          error: "Invalid JSON",
          raw: text
        };
      }
      if (json.code !== 200) {
        return {
          status: "Error",
          error: json.msg || "API error",
          raw: json
        };
      }
      console.log(`========== MODEL FETCH SUCCESS ==========\n`);
      return {
        status: "Success",
        data: json?.data
      };
    } catch (e) {
      console.error(`[ERROR] Model fetch failed: ${e.message}`);
      return {
        status: "Error",
        error: e.message
      };
    }
  }
  async chat({
    prompt: question,
    language = this.defaultParams.language,
    conversationId = this.defaultParams.conversationId,
    model = this.defaultParams.aiVersion,
    ...rest
  }) {
    if (!question) {
      throw new Error("Question required");
    }
    console.log(`\n========== CHAT START ==========`);
    console.log(`Question: ${question}`);
    try {
      await this._createUser();
      console.log(`[LOG] Using deviceID: ${this.deviceID}`);
      const chatParams = {
        question: question,
        language: language,
        conversationId: conversationId,
        aiVersion: model,
        ...rest
      };
      const security = this._genSecurity(chatParams);
      const body = {
        bundle: this.defaultParams.bundle,
        security: security
      };
      const response = await fetch(`${this.baseURL}/common/sse/chat`, {
        method: "POST",
        headers: {
          "User-Agent": "Dart/3.6 (dart:io)",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const chunks = [];
      for await (const chunk of response.body) {
        chunks.push(chunk.toString());
      }
      const text = chunks.join("");
      let fullAnswer = "";
      let finalResult = {
        answer: "",
        message_id: "",
        conversation_id: conversationId,
        status: "Error"
      };
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            if (json.code === -1 && json.message === "签名失败") {
              finalResult.status = "ERROR: Signature failed";
              return finalResult;
            }
            const part = json.data?.answer || json.answer || "";
            if (part) fullAnswer += part;
            if (json.data?.message_id) finalResult.message_id = json.data.message_id;
            if (json.data?.conversation_id) finalResult.conversation_id = json.data.conversation_id;
            if (json.code === 0 && json.message === "成功") finalResult.status = "Success";
          } catch (e) {}
        }
      }
      finalResult.answer = fullAnswer.trim() || "No answer received";
      console.log(`========== CHAT END ==========`);
      return finalResult;
    } catch (e) {
      console.error(`[ERROR] Chat failed: ${e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new ChatAPI();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "model":
        response = await api.model(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'chat', 'model'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}