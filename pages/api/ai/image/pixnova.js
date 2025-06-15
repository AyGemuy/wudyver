import axios from "axios";
import WebSocket from "ws";
class PixnovaAI {
  constructor() {
    this.ws = null;
    this.sessionHash = this.generateHash();
    this.result = null;
    this.baseURL = "https://oss-global.pixnova.ai/";
    this.currentOperationType = null;
  }
  generateHash() {
    return Math.random().toString(36).substring(2, 15);
  }
  generateWebSocketKey() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Buffer.from(Array.from({
      length: 22
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("")).toString("base64");
  }
  async connect(wsUrl, operationType) {
    try {
      return new Promise((resolve, reject) => {
        this.currentOperationType = operationType;
        this.result = null;
        this.ws = new WebSocket(wsUrl, {
          headers: {
            Upgrade: "websocket",
            Origin: "https://pixnova.ai",
            "Cache-Control": "no-cache",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            Pragma: "no-cache",
            Connection: "Upgrade",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": this.generateWebSocketKey(),
            "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
          }
        });
        this.ws.on("open", () => {
          console.log(`[PixnovaAI] [${this.currentOperationType}] WebSocket connected.`);
          this.ws.send(JSON.stringify({
            session_hash: this.sessionHash
          }));
          resolve();
        });
        this.ws.on("message", data => this.handleMessage(data));
        this.ws.on("error", err => {
          console.error(`[PixnovaAI] [${this.currentOperationType}] WebSocket error:`, err);
          reject(err);
        });
        this.ws.on("close", (code, reason) => {
          console.log(`[PixnovaAI] [${this.currentOperationType}] WebSocket disconnected. Code: ${code}, Reason: ${reason}`);
        });
      });
    } catch (error) {
      console.error(`[PixnovaAI] [${this.currentOperationType}] Error connecting to WebSocket:`, error);
      throw new Error("Failed to connect to WebSocket: " + error.message);
    }
  }
  async imageToBase64(imageUrl) {
    try {
      console.log(`[PixnovaAI] Converting image to Base64: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const mimeType = response.headers["content-type"] || "image/jpeg";
      return `data:${mimeType};base64,${Buffer.from(response.data).toString("base64")}`;
    } catch (error) {
      console.error(`[PixnovaAI] Error converting image to Base64:`, error);
      throw new Error("Failed to convert image to Base64: " + error.message);
    }
  }
  async sendPayload(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        console.log(`[PixnovaAI] [${this.currentOperationType}] Sending payload...`);
        this.ws.send(JSON.stringify(payload));
      } catch (error) {
        console.error(`[PixnovaAI] [${this.currentOperationType}] Error sending payload:`, error);
      }
    } else {
      console.warn(`[PixnovaAI] [${this.currentOperationType}] WebSocket is not open. Cannot send payload.`);
    }
  }
  handleMessage(data) {
    try {
      const parsedData = JSON.parse(data);
      console.log(`[PixnovaAI] [${this.currentOperationType}] Received WS data:`, parsedData);
      if (this.currentOperationType === "expression") {
        if (parsedData.msg === "send_hash" && !this._sessionHashSent) {
          console.log(`[PixnovaAI] [${this.currentOperationType}] Sending session hash.`);
          this.ws.send(JSON.stringify({
            session_hash: this.sessionHash
          }));
          this._sessionHashSent = true;
        } else if (parsedData.msg === "process_completed") {
          if (parsedData.output?.status === "successed" && parsedData.output?.result?.length > 0) {
            this.result = `${this.baseURL}${parsedData.output.result[0]}`;
            console.log(`[PixnovaAI] [${this.currentOperationType}] Process completed successfully. Result: ${this.result}`);
          } else {
            this.result = {
              error: "Processing failed or no result image found."
            };
            console.error(`[PixnovaAI] [${this.currentOperationType}] Process completed with failure:`, parsedData.output);
          }
        }
      } else {
        if (parsedData.msg === "process_completed" && parsedData.success) {
          this.result = this.baseURL + parsedData.output.result[0];
          console.log(`[PixnovaAI] [${this.currentOperationType}] Process completed successfully. Result: ${this.result}`);
        } else if (parsedData.msg === "process_completed" && !parsedData.success) {
          this.result = {
            error: "Processing failed: " + (parsedData.output?.detail || "Unknown error")
          };
          console.error(`[PixnovaAI] [${this.currentOperationType}] Process completed with failure:`, parsedData.output);
        }
      }
    } catch (error) {
      console.error(`[PixnovaAI] [${this.currentOperationType}] Error parsing WebSocket message:`, error);
      this.result = {
        error: "Failed to parse WebSocket message or an error occurred."
      };
    }
  }
  async waitForCompletion() {
    return new Promise((resolve, reject) => {
      console.log(`[PixnovaAI] [${this.currentOperationType}] Waiting for process completion...`);
      const checkInterval = setInterval(() => {
        if (this.result) {
          clearInterval(checkInterval);
          this.ws.close();
          if (this.result.error) {
            reject(new Error(this.result.error));
          } else {
            resolve(this.result);
          }
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
      console.log("[PixnovaAI] Starting img2img process...");
      await this.connect("wss://pixnova.ai/demo-photo2anime/queue/join", "img2img");
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
      console.error("[PixnovaAI] Error in img2img:", error);
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
      console.log("[PixnovaAI] Starting txt2img process...");
      await this.connect("wss://pixnova.ai/demo-text2image-series/queue/join", "txt2img");
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
      console.error("[PixnovaAI] Error in txt2img:", error);
      throw error;
    }
  }
  async expression({
    imageUrl,
    rotate_pitch = 0,
    rotate_yaw = 0,
    rotate_roll = 0,
    blink = 3,
    eyebrow = -10,
    wink = 0,
    pupil_x = 0,
    pupil_y = 0,
    aaa = 30,
    eee = 15,
    woo = 0,
    smile = -.3,
    request_from = 2
  }) {
    try {
      console.log("[PixnovaAI] Starting expression generation process...");
      await this.connect("wss://pixnova.ai/demo-ai-expression-edit/queue/join", "expression");
      const base64Image = await this.imageToBase64(imageUrl);
      const payload = {
        data: {
          source_image: base64Image,
          rotate_pitch: rotate_pitch,
          rotate_yaw: rotate_yaw,
          rotate_roll: rotate_roll,
          blink: blink,
          eyebrow: eyebrow,
          wink: wink,
          pupil_x: pupil_x,
          pupil_y: pupil_y,
          aaa: aaa,
          eee: eee,
          woo: woo,
          smile: smile,
          request_from: request_from
        }
      };
      await this.sendPayload(payload);
      return await this.waitForCompletion();
    } catch (error) {
      console.error("[PixnovaAI] Error in expression generation:", error);
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
        action: "txt2img | img2img | expression"
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
      case "expression":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await pixnova[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img | expression`
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