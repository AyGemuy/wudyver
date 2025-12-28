import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class ChatUpAI {
  constructor(options = {}) {
    this.cfg = {
      apiBase: "https://api.chatupai.org/api/v1/",
      deviceId: this.generateCryptoId(),
      debug: options.debug ?? true
    };
    this.schema = {
      chat: ["prompt", "messages"],
      completions: ["prompt", "messages"],
      image: ["prompt"],
      youtube: ["video_id", "url"],
      web: ["prompt", "messages"],
      pdf: ["file"]
    };
    this.client = axios.create({
      baseURL: this.cfg.apiBase,
      timeout: 6e4,
      headers: {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json"
      }
    });
  }
  log(step, message) {
    if (this.cfg.debug) {
      console.log(`[${new Date().toLocaleTimeString()}] [ChatUp-AI] [${step}]: ${message}`);
    }
  }
  generateCryptoId() {
    return crypto.randomBytes(8).toString("hex");
  }
  async solveMedia(input) {
    try {
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof input === "string" && input.includes("base64,")) {
        return Buffer.from(input.split("base64,").pop(), "base64");
      }
      return Buffer.isBuffer(input) ? input : null;
    } catch (e) {
      return null;
    }
  }
  async generate({
    mode,
    ...rest
  }) {
    try {
      this.log("Start", `Mode: ${mode}`);
      const requiredParams = this.schema[mode];
      if (!requiredParams) {
        const err = {
          status: false,
          message: "Invalid mode",
          availableModes: Object.keys(this.schema)
        };
        console.log(err);
        return err;
      }
      const hasRequired = requiredParams.length === 0 || requiredParams.some(key => rest[key]);
      if (!hasRequired) {
        const err = {
          status: false,
          message: "Missing required parameters",
          requiredParams: requiredParams
        };
        console.log(err);
        return err;
      }
      let config = {
        method: "POST",
        url: "",
        data: {},
        headers: {
          "Content-Type": "application/json"
        }
      };
      const defaultSystem = {
        role: "system",
        content: "try to give answer less then 120 words and if needed or if user ask for bigger response then only give bigger answer"
      };
      switch (mode) {
        case "chat":
        case "completions":
          config.url = "completions";
          config.data = {
            messages: rest.messages || [{
              role: "user",
              content: rest.prompt
            }],
            ...rest
          };
          if (!config.data.messages.some(m => m.role === "system")) {
            config.data.messages.push(defaultSystem);
          }
          break;
        case "image":
          config.url = "auto-image-generate";
          config.data = {
            n: 1,
            size: "1024x1024",
            prompt: rest.prompt,
            ...rest
          };
          break;
        case "youtube":
          config.url = "yt-summary";
          config.data = {
            video_id: rest.video_id || rest.url,
            ...rest
          };
          break;
        case "web":
          config.url = "web-browsing";
          config.data = {
            messages: rest.messages || [{
              role: "user",
              content: rest.prompt
            }],
            ...rest
          };
          break;
        case "pdf":
          const buffer = await this.solveMedia(rest.file);
          if (!buffer) return {
            status: false,
            message: "Invalid PDF file"
          };
          const form = new FormData();
          form.append("file", buffer, rest.fileName || "file.pdf");
          config.url = "pdf-to-text";
          config.data = form;
          config.headers = {
            ...config.headers,
            ...form.getHeaders()
          };
          break;
      }
      this.log("Network", `Requesting ${config.url}`);
      const response = await this.client(config);
      const result = response.data?.data || response.data;
      this.log("Success", "Response received");
      console.log(result);
      return result;
    } catch (e) {
      const errorResponse = {
        status: false,
        message: e.response?.data?.message || e.message,
        error: e.response?.data || "Internal Error"
      };
      this.log("Error", errorResponse.message);
      console.log(errorResponse);
      return errorResponse;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ChatUpAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}