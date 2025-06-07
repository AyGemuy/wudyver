import axios from "axios";
import crypto from "crypto";
class GizaiAI {
  constructor() {
    this.u = "https://app.giz.ai/api/data/users/inferenceServer.infer";
    this.b = "https://app.giz.ai";
    this.h = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: this.b,
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0"
    };
    this.si = this.mkSubId();
    this.ii = this.mkInstId();
  }
  ip() {
    return Array.from(crypto.randomBytes(4)).map(b => b % 256).join(".");
  }
  id(l = 16) {
    return crypto.randomBytes(l).toString("hex");
  }
  hdrs() {
    const ip = this.ip();
    return {
      origin: this.b,
      referer: `${this.b}/`,
      "user-agent": this.h["user-agent"],
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.id(8),
      ...this.h
    };
  }
  fbCk() {
    const n = new Date().toISOString();
    const i = encodeURIComponent(JSON.stringify({
      referrer: "direct",
      date: n,
      userAgent: "Mozilla/5.0",
      initialURL: `${this.b}/`,
      browserLanguage: "id-ID",
      downlink: 1.25
    }));
    const r = this.rs(17);
    const ga = `GA1.1.${Math.random() * 1e9 | 0}.${Date.now()}`;
    const gc = `1.1.${Math.random() * 1e9 | 0}.${Date.now()}`;
    const pk = `58db2317fe94a109.${Date.now()}.`;
    const ps = "1";
    const gak = `GS1.1.${Date.now()}.1.1.${Date.now() + 6e4 | 0}.60.0.0`;
    return `initialInfo=${i}; pfb9=${r}; _ga=${ga}; _gcl_au=${gc}; _pk_id.1.2e21=${pk}; _pk_ses.1.2e21=${ps}; _ga_7KCQ8VVKVL=${gak}`;
  }
  rs(l) {
    let s = "";
    const c = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < l; i++) s += c[Math.random() * c.length | 0];
    return s;
  }
  mkSubId() {
    let s = "";
    const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 21; i++) {
      s += c[Math.random() * c.length | 0];
      if ((i + 1) % 5 === 0 && i < 20) s += "-";
    }
    return s;
  }
  mkInstId() {
    let s = "";
    const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 21; i++) s += c[Math.random() * c.length | 0];
    return s;
  }
  async chat(params) {
    const requestBody = {
      model: params.model || "gemini-2.0-flash-lite",
      input: {
        messages: Array.isArray(params.messages) && params.messages.length > 0 ? params.messages : [{
          type: "human",
          content: params.prompt
        }],
        mode: params.mode || "plan"
      },
      noStream: params.noStream === undefined ? true : params.noStream,
      subscribeId: this.si,
      instanceId: this.ii,
      ...params.extra
    };
    console.log("Mempersiapkan permintaan Chat dengan parameter:", params);
    try {
      const response = await this._sendRequest(requestBody);
      console.log("Permintaan Chat berhasil dikirim dan diterima.");
      return response;
    } catch (error) {
      console.error("Gagal mengirim atau menerima permintaan Chat:", error);
      throw error;
    }
  }
  async image(params) {
    const requestBody = {
      model: params.model || "image-generation",
      baseModel: params.baseModel || "flux1",
      input: {
        settings: {
          character: params.character || "AI",
          responseMode: params.responseMode || "text",
          voice: params.voice || "tts-1:onyx",
          ttsSpeed: params.ttsSpeed || "1",
          imageModel: params.imageModelSetting || "sdxl"
        },
        prompt: params.prompt,
        width: params.width || "1280",
        height: params.height || "720",
        batch_size: params.batchSize || "1",
        style: params.style || "undefined",
        checkpoint: params.checkpoint || "shuttle-jaguar-fp8.safetensors",
        steps: params.steps || 4,
        growMask: params.growMask || 30,
        face_detailer: params.face_detailer || false,
        upscale: params.upscale || false,
        mode: params.mode || "image-generation"
      },
      subscribeId: this.si,
      instanceId: this.ii,
      ...params.extra
    };
    console.log("Mempersiapkan permintaan Image dengan parameter:", params);
    try {
      const response = await this._sendRequest(requestBody);
      console.log("Permintaan Image berhasil dikirim dan diterima.");
      return response;
    } catch (error) {
      console.error("Gagal mengirim atau menerima permintaan Image:", error);
      throw error;
    }
  }
  async video(params) {
    const requestBody = {
      model: params.model || "video-generation",
      baseModel: params.baseModel || "ltxvideo-t2v",
      input: {
        settings: {
          character: params.character || "AI",
          responseMode: params.responseMode || "text",
          voice: params.voice || "tts-1:onyx",
          ttsSpeed: params.ttsSpeed || "1",
          imageModel: params.sim || "sdxl"
        },
        baseModel: params.baseModel || "ltxvideo-t2v",
        prompt: params.prompt || "A futuristic cyberpunk at rio de jenero.",
        width: params.width || "512",
        height: params.height || "512",
        frames: params.frames || "9",
        withAudio: params.withAudio || false,
        imageModel: params.imageModel || "flux1",
        imageCheckpoint: params.imageCheckpoint || "shuttle-jaguar-fp8.safetensors",
        keepImage: params.keepImage || false,
        enhancePrompt: params.enhancePrompt || true,
        steps: params.steps || 20,
        cfg: params.cfg || 3,
        mode: "video-generation"
      },
      subscribeId: this.si,
      instanceId: this.ii,
      ...params
    };
    console.log("Mempersiapkan permintaan Video dengan parameter:", params);
    try {
      const response = await this._sendRequest(requestBody);
      console.log("Permintaan Video berhasil dikirim dan diterima.");
      return response;
    } catch (error) {
      console.error("Gagal mengirim atau menerima permintaan Video:", error);
      throw error;
    }
  }
  async _sendRequest(requestBody) {
    try {
      const response = await axios.post(this.u, requestBody, {
        headers: this.hdrs()
      });
      return response.data;
    } catch (error) {
      console.error("Error saat mengirim permintaan:", error);
      throw error;
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
      error: "Missing required field: action",
      required: {
        action: "chat | image | video"
      }
    });
  }
  const gizai = new GizaiAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await gizai[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await gizai[action](params);
        break;
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await gizai[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image | video`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}