import axios from "axios";
import crypto from "crypto";
import {
  FormData,
  Blob
} from "form-data";
import apiConfig from "@/configs/apiConfig";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class VeniceAPI {
  userAgents = ["Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (Linux; Android 12; SM-S906N Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1"];
  constructor() {
    this.baseUrl = "https://venice.ai";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload?host=Catbox`;
    this.api = axios.create({
      baseURL: "https://outerface.venice.ai/api/inference/"
    });
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  _generateAnonymousUserId() {
    const part1 = Math.floor(Math.random() * 1e9);
    const part2 = Math.floor(Math.random() * 1e9);
    return `user_anon_${part1}${part2}`;
  }
  _generateId() {
    return Math.random().toString(36).substring(2, 9);
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    const randomUserAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": randomUserAgent,
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.randomID(8),
      ...extra
    };
  }
  async chat(rest = {}) {
    try {
      const defaultPayload = {
        conversationType: "text",
        type: "text",
        modelId: "mistral-31-24b",
        modelName: "Venice Uncensored",
        modelType: "text",
        prompt: [{
          content: "apa itu wibu",
          role: "user"
        }],
        systemPrompt: "",
        includeVeniceSystemPrompt: true,
        isCharacter: false,
        simpleMode: true,
        characterId: "",
        id: "",
        textToSpeech: {
          voiceId: "af_sky",
          speed: 1
        },
        webEnabled: true,
        reasoning: true,
        clientProcessingTime: 541
      };
      const {
        messages,
        prompt,
        ...otherRest
      } = rest;
      let finalPrompt = defaultPayload.prompt;
      if (messages?.length) {
        finalPrompt = messages;
      } else if (typeof prompt === "string" && prompt.trim() !== "") {
        finalPrompt = [{
          content: prompt,
          role: "user"
        }];
      }
      const payload = {
        ...defaultPayload,
        ...otherRest,
        prompt: finalPrompt,
        requestId: this._generateId(),
        messageId: this._generateId(),
        userId: this._generateAnonymousUserId()
      };
      const headers = this.buildHeaders({
        "content-type": "application/json",
        priority: "u=1, i",
        "x-venice-version": "interface@20250611.010712+52c00c6"
      });
      const {
        data
      } = await this.api.post("/chat", payload, {
        headers: headers
      });
      return this.parseChatStream(data);
    } catch (error) {
      console.error("Error in chat request:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  parseChatStream(rawResponse) {
    if (!rawResponse || typeof rawResponse !== "string") {
      return {
        result: "",
        array_stream: [],
        kinds: {}
      };
    }
    const array_stream = rawResponse.split("\n").filter(line => line.startsWith("{")).map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(obj => obj !== null);
    const kinds = array_stream.reduce((acc, obj) => {
      const key = obj.kind || "unknown";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(obj);
      return acc;
    }, {});
    const result = (kinds.content || []).map(obj => obj.content).join("");
    return {
      result: result,
      array_stream: array_stream,
      kinds: kinds
    };
  }
  async uploadImage(buffer, mimeType = "image/png") {
    try {
      const base64Image = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      const requestData = {
        file: dataUri
      };
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, requestData);
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async image(rest = {}) {
    try {
      const defaultPayload = {
        aspectRatio: "1:1",
        cfgScale: 5,
        format: "webp",
        height: 1024,
        steps: 20,
        variants: 1,
        width: 1024,
        modelId: "hidream"
      };
      const payload = {
        ...defaultPayload,
        ...rest,
        requestId: this._generateId(),
        messageId: this._generateId(),
        seed: Math.floor(Math.random() * 1e8),
        userId: this._generateAnonymousUserId()
      };
      const headers = this.buildHeaders({
        "content-type": "application/json",
        priority: "u=1, i",
        "x-venice-version": "interface@20250611.010712+52c00c6"
      });
      const {
        data: imageBuffer
      } = await this.api.post("/image", payload, {
        headers: headers,
        responseType: "arraybuffer"
      });
      const uploadResult = await this.uploadImage(imageBuffer);
      return uploadResult;
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Terjadi kesalahan di metode image:", errorMessage);
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
        action: "chat | image"
      }
    });
  }
  const venice = new VeniceAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await venice[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await venice[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}