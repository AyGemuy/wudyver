import axios from "axios";
import WebSocket from "ws";
class PixnovaAI {
  constructor() {
    this.ws = null;
    this.sessionHash = this.generateHash();
    this.result = null;
    this.baseURL = "https://oss-global.pixnova.ai/";
  }
  async connect(wsUrl) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl, {
          headers: {
            Upgrade: "websocket",
            Origin: "https://pixnova.ai",
            "Cache-Control": "no-cache",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            Pragma: "no-cache",
            Connection: "Upgrade",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": "randomkey==",
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
      } catch (error) {
        reject(new Error("Gagal menghubungkan ke WebSocket: " + error.message));
      }
    });
  }
  async imageToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return `data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`;
    } catch (error) {
      throw new Error("Gagal mengonversi gambar ke Base64: " + error.message);
    }
  }
  async sendPayload(payload) {
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error("Error mengirim payload:", error);
    }
  }
  handleMessage(data) {
    try {
      const parsedData = JSON.parse(data);
      console.log("[📩] WS Data:", parsedData);
      if (parsedData.msg === "process_completed" && parsedData.success) {
        this.result = this.baseURL + parsedData.output.result[0];
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
  async img2img({
    imageUrl,
    prompt = "recreate this image in ghibli style",
    strength = .6,
    model = "meinamix_meinaV11.safetensors",
    lora = ["Studio_Chibli_Style_offset:0.7"],
    width = 1024,
    height = 1024,
    negative_prompt = "(worst quality, low quality:1.4), cropped, lowres",
    cfg = 7,
    request_from = 2,
    ...custom
  }) {
    try {
      await this.connect("wss://pixnova.ai/demo-photo2anime/queue/join");
      const base64Image = await this.imageToBase64(imageUrl);
      const payload = {
        data: {
          source_image: base64Image,
          prompt: prompt,
          strength: strength,
          model: model,
          lora: lora,
          width: width,
          height: height,
          negative_prompt: negative_prompt,
          cfg: cfg,
          request_from: request_from,
          ...custom
        }
      };
      await this.sendPayload(payload);
      return await this.waitForCompletion();
    } catch (error) {
      console.error("Error dalam img2img:", error);
      throw error;
    }
  }
  async txt2img({
    prompt = "recreate this image in ghibli style",
    model = "meinamix_meinaV11.safetensors",
    lora = ["Studio_Chibli_Style_offset:0.7"],
    width = 1024,
    height = 1024,
    negative_prompt = "(worst quality, low quality:1.4), cropped, lowres",
    cfg = 7,
    request_from = 2,
    ...custom
  }) {
    try {
      await this.connect("wss://api.pixnova.ai/demo-text2image-series/queue/join");
      const payload = {
        data: {
          prompt: prompt,
          model: model,
          lora: lora,
          width: width,
          height: height,
          negative_prompt: negative_prompt,
          cfg: cfg,
          request_from: request_from,
          ...custom
        }
      };
      await this.sendPayload(payload);
      return await this.waitForCompletion();
    } catch (error) {
      console.error("Error dalam txt2img:", error);
      throw error;
    }
  }
  generateHash() {
    return Math.random().toString(36).substring(2, 15);
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
        action: "txt2img | img2img"
      }
    });
  }
  const pixnova = new PixnovaAI();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await pixnova[action](params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await pixnova[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}