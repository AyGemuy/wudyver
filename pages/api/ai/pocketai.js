import axios from "axios";
import CryptoJS from "crypto-js";
class PocketAI {
  constructor() {
    this.cfg = {
      key: "hglo08ytbhlat6yhnjkoyefmnokuo",
      base: "https://support.pocketai.app",
      platform: "android",
      ua: "2",
      plus: true,
      timeout: 3e4,
      models: {
        gpt: "/messageAndroid1",
        gptConv: "/messageConv",
        gptVision: "/messageConvV",
        gptO: "/messageConvO",
        gptO1: "/messageConvO1",
        gptO1Mini: "/messageConvO1M",
        gptO3: "/messageConvO3M",
        gemini: "/messageGem",
        grok: "/messageGK",
        grokVision: "/messageGKV",
        llama: "/messageLLama",
        llamaConv: "/messageConvO3M",
        deepseekCoder: "/messageDSC",
        deepseekReasoner: "/messageDSR"
      }
    };
  }
  _validate(model) {
    const available = Object.keys(this.cfg.models);
    if (!available.includes(model)) {
      console.log("[Validate] Invalid model:", model);
      return {
        success: false,
        error: "Invalid model",
        message: `Model '${model}' not found`,
        available: available
      };
    }
    return null;
  }
  async _solveImage(img) {
    try {
      console.log("[SolveImage] Processing...");
      if (typeof img === "string" && img.startsWith("data:image/")) {
        console.log("[SolveImage] Already data URI");
        return img;
      }
      if (typeof img === "string" && /^[A-Za-z0-9+/=]+$/.test(img.slice(0, 100))) {
        console.log("[SolveImage] Base64 detected, adding header");
        return `data:image/jpeg;base64,${img}`;
      }
      if (typeof img === "object" && (img instanceof ArrayBuffer || img instanceof Uint8Array || ArrayBuffer.isView(img))) {
        console.log("[SolveImage] Buffer detected");
        let buffer = img;
        if (img instanceof ArrayBuffer) {
          buffer = new Uint8Array(img);
        }
        const binary = Array.from(buffer).map(b => String.fromCharCode(b)).join("");
        const base64 = btoa(binary);
        return `data:image/jpeg;base64,${base64}`;
      }
      if (typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))) {
        console.log("[SolveImage] URL detected, fetching...");
        const res = await axios.get(img, {
          responseType: "arraybuffer",
          timeout: 1e4
        });
        const buffer = new Uint8Array(res.data);
        const binary = Array.from(buffer).map(b => String.fromCharCode(b)).join("");
        const base64 = btoa(binary);
        const mime = res.headers["content-type"] || "image/jpeg";
        return `data:${mime};base64,${base64}`;
      }
      console.log("[SolveImage] Unknown format, returning as-is");
      return img;
    } catch (e) {
      console.log("[SolveImage Error]", e.message);
      return img;
    }
  }
  _encrypt(data) {
    try {
      return CryptoJS.AES.encrypt(JSON.stringify(data), this.cfg.key).toString();
    } catch (e) {
      console.log("[Encrypt Error]", e.message);
      throw e;
    }
  }
  _decrypt(str) {
    try {
      const bytes = CryptoJS.AES.decrypt(str, this.cfg.key);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
      console.log("[Decrypt Error]", e.message);
      return null;
    }
  }
  _fmt(msgs, model) {
    try {
      if (model === "gemini") {
        return msgs.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{
            text: m.content
          }]
        }));
      }
      if (model === "grok" || model === "grokVision") {
        return msgs.map(m => ({
          role: m.role === "system" ? "user" : m.role,
          content: [{
            type: "text",
            text: m.content
          }]
        }));
      }
      return msgs.map(m => ({
        role: m.role,
        content: [{
          type: "text",
          text: m.content
        }]
      }));
    } catch (e) {
      console.log("[Format Error]", e.message);
      return msgs;
    }
  }
  async _fmtVision(msgs) {
    try {
      const fmt = [];
      for (const m of msgs) {
        const msg = {
          role: m.role === "system" ? "user" : m.role,
          content: [{
            type: "text",
            text: m.content || ""
          }]
        };
        if (m.image) {
          console.log("[FormatVision] Image found in message");
          const dataUri = await this._solveImage(m.image);
          msg.content.push({
            type: "image_url",
            image_url: {
              url: dataUri
            }
          });
        } else if (m.base64Uri) {
          console.log("[FormatVision] base64Uri found");
          const dataUri = await this._solveImage(m.base64Uri);
          msg.content.push({
            type: "image_url",
            image_url: {
              url: dataUri
            }
          });
        }
        fmt.push(msg);
      }
      return fmt;
    } catch (e) {
      console.log("[Format Vision Error]", e.message);
      return msgs;
    }
  }
  _endpoint(model) {
    const ep = this.cfg.models[model] || this.cfg.models.gpt;
    if (this.cfg.platform === "ios" && (ep === "/messageAndroid1" || ep === "/message")) {
      return "/message";
    }
    return ep;
  }
  async chat(opts = {}) {
    const model = opts.model || "gpt";
    console.log(`[Chat] Model: ${model}`);
    try {
      const validationError = this._validate(model);
      if (validationError) {
        return validationError;
      }
      const msgs = opts.messages || [];
      const prompt = opts.prompt || "";
      const history = [...msgs];
      if (prompt) {
        history.push({
          role: "user",
          content: prompt
        });
      }
      console.log("[Chat] Formatting messages...");
      let fmtMsgs;
      if (model.includes("Vision") || model === "grokVision") {
        fmtMsgs = await this._fmtVision(history);
      } else if (model === "gemini") {
        fmtMsgs = this._fmt(history, "gemini");
      } else if (model === "grok") {
        fmtMsgs = this._fmt(history, "grok");
      } else {
        fmtMsgs = this._fmt(history, "default");
      }
      const payload = {
        daffi3: "1",
        userAgent: opts.ua || this.cfg.ua,
        plus: opts.plus ?? this.cfg.plus,
        prompt: fmtMsgs
      };
      console.log("[Chat] Encrypting payload...");
      const encrypted = this._encrypt(payload);
      const ep = this._endpoint(model);
      const url = `${this.cfg.base}${ep}`;
      console.log(`[Chat] POST ${url}`);
      const res = await axios.post(url, {
        bodyStr: encrypted
      }, {
        headers: {
          "User-Agent": opts.ua || this.cfg.ua,
          "Content-Type": "application/json"
        },
        timeout: opts.timeout || this.cfg.timeout
      });
      console.log(`[Chat] Status: ${res.status}`);
      if (res.status !== 200) {
        console.log("[Chat] Error response:", res.status, res.data);
        throw new Error(`HTTP ${res.status}`);
      }
      console.log("[Chat] Decrypting response...");
      const decrypted = this._decrypt(res.data);
      if (!decrypted) {
        throw new Error("Decrypt failed");
      }
      console.log("[Chat] Success");
      return {
        success: true,
        ...decrypted
      };
    } catch (e) {
      console.log("[Chat] Error:", e.message);
      return {
        success: false,
        error: e.message,
        status: e.response?.status,
        data: e.response?.data
      };
    }
  }
  list() {
    return {
      success: true,
      models: Object.keys(this.cfg.models),
      total: Object.keys(this.cfg.models).length
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new PocketAI();
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