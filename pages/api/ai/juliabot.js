import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import SpoofHead from "@/lib/spoof-head";
class JuliaBotAPI {
  constructor() {
    this.baseURL = "https://core.juliabot.com/api/v1/bot/";
    this.validChatTypes = ["chatAssistant", "coder", "brainstorm", "psycoanalysis"];
    this.validPowerfulTypes = ["Absolute", "LastNews"];
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        origin: "https://ai.juliabot.com",
        referer: "https://ai.juliabot.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  async chat({
    powerful = false,
    type = "chatAssistant",
    prompt,
    sessionId = uuidv4(),
    sessionKey,
    ...rest
  }) {
    if (!prompt) {
      throw new Error('Paramenter "prompt" diperlukan.');
    }
    if (powerful) {
      if (!this.validPowerfulTypes.includes(type)) {
        throw new Error(`Tipe tidak valid: "${type}" untuk mode powerful. Tipe yang tersedia adalah: ${this.validPowerfulTypes.join(", ")}.`);
      }
    } else {
      if (!this.validChatTypes.includes(type)) {
        throw new Error(`Tipe tidak valid: "${type}" untuk mode standar. Tipe yang tersedia adalah: ${this.validChatTypes.join(", ")}.`);
      }
    }
    const currentSessionKey = sessionKey || sessionId;
    const endpoint = powerful ? "powerfulRag/" : "JuliabotChat/";
    const dataPayload = {
      message: prompt,
      type: type,
      new_chat: true,
      include_search: false,
      language: "en",
      ...rest,
      sessionId: sessionId
    };
    console.log(`Mengirim permintaan ke: ${endpoint} dengan tipe: ${type}`);
    try {
      const response = await this.apiClient.post(endpoint, dataPayload, {
        headers: {
          "x-session-key": currentSessionKey
        }
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error("Error Data:", error.response.data);
        console.error("Error Status:", error.response.status);
        throw new Error(`API merespons dengan status ${error.response.status}`);
      } else if (error.request) {
        throw new Error("Tidak ada respons yang diterima dari server.");
      } else {
        throw new Error(`Terjadi kesalahan saat menyiapkan permintaan: ${error.message}`);
      }
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
    const juliabot = new JuliaBotAPI();
    const response = await juliabot.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}