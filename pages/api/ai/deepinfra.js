import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class DeepInfraChat {
  availableModels = ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen2.5-72B-Instruct"];
  userAgents = ["Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Mozilla/5.0 (Linux; Android 12; SM-S906N Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1"];
  constructor() {
    this.baseUrl = "https://ai-sdk-starter-deepinfra.vercel.app";
    this.api = axios.create({
      baseURL: this.baseUrl
    });
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const randomUserAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    return {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,id;q=0.8",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": randomUserAgent,
      "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      ...SpoofHead(),
      ...extra
    };
  }
  async chat(rest = {}) {
    try {
      const {
        prompt,
        model,
        messages,
        ...otherRest
      } = rest;
      if (model && !this.availableModels.includes(model)) {
        const errorMessage = `Model tidak valid: "${model}".\n\nModel yang tersedia adalah:\n- ${this.availableModels.join("\n- ")}`;
        return {
          result: errorMessage,
          error: true,
          availableModels: this.availableModels
        };
      }
      const defaultModel = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
      let finalMessages = [];
      if (messages && messages.length > 0) {
        finalMessages = messages;
      } else if (prompt) {
        finalMessages = [{
          role: "user",
          content: prompt,
          parts: [{
            type: "text",
            text: prompt
          }]
        }];
      } else {
        throw new Error("Dibutuhkan 'prompt' atau 'messages'.");
      }
      const payload = {
        id: this.randomID(8),
        selectedModel: model || defaultModel,
        messages: finalMessages,
        ...otherRest
      };
      const headers = this.buildHeaders({
        "Content-Type": "application/json"
      });
      const {
        data
      } = await this.api.post("/api/chat", payload, {
        headers: headers
      });
      const textParts = [];
      const array_stream = [];
      const kinds = {};
      if (typeof data === "string") {
        const lines = data.split("\n").filter(Boolean);
        for (const line of lines) {
          const separatorIndex = line.indexOf(":");
          if (separatorIndex === -1) continue;
          const prefix = line.substring(0, separatorIndex);
          const valueStr = line.substring(separatorIndex + 1);
          try {
            const parsedValue = JSON.parse(valueStr);
            array_stream.push({
              type: prefix,
              data: parsedValue
            });
            if (!kinds[prefix]) {
              kinds[prefix] = [];
            }
            kinds[prefix].push(parsedValue);
            if (prefix === "0" && typeof parsedValue === "string") {
              textParts.push(parsedValue);
            }
          } catch (e) {}
        }
      }
      const result = textParts.join("").trim();
      return {
        result: result || "Tidak ada jawaban.",
        array_stream: array_stream,
        ...kinds
      };
    } catch (err) {
      const errorMessage = err.response ? JSON.stringify(err.response.data) : err.message;
      return {
        result: `Gagal mendapatkan jawaban: ${errorMessage}`,
        error: true,
        details: err
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
    const ai = new DeepInfraChat();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}