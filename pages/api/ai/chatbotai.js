import axios from "axios";
import crypto from "crypto";
class ChatGenieAI {
  constructor() {
    this.fbKey = "AIzaSyAG325-n4N-5jJDgSHnKuST7XQQsPWingk";
    this.backendUrl = "https://genie-production-yfvxbm4e6q-uc.a.run.app";
    this.origin = "https://chatbotai.com";
    this.internalToken = null;
    this.chatId = crypto.randomUUID();
    this.internalMessages = [];
  }
  _log(step, detail = "") {
    console.log(`[ChatGenie][${new Date().toLocaleTimeString()}] ${step} > ${detail}`);
  }
  async _authenticate() {
    try {
      this._log("Auth", "Requesting new anonymous token...");
      const {
        data
      } = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.fbKey}`, {
        returnSecureToken: true
      });
      this.internalToken = data.idToken;
      return data.idToken;
    } catch (err) {
      this._log("Auth Error", err.message);
      throw err;
    }
  }
  async chat({
    token,
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      let activeToken = token || this.internalToken;
      if (!activeToken) {
        this._log("System", "Token tidak ditemukan, auto-generating...");
        activeToken = await this._authenticate();
      }
      let history = messages.length > 0 ? messages : this.internalMessages;
      const userMsgId = crypto.randomUUID();
      const parentId = history.length > 0 ? history[history.length - 1].id : null;
      const timestamp = Date.now();
      const userMessage = {
        id: userMsgId,
        content: prompt,
        role: "user",
        media: null,
        parentMessageId: parentId,
        createdAt: timestamp,
        updatedAt: timestamp,
        searchedUrls: [],
        type: "message"
      };
      history.push(userMessage);
      this._log("User", `"${prompt.substring(0, 30)}..."`);
      const completionId = crypto.randomUUID();
      const url = `${this.backendUrl}/v4/chats/${this.chatId}/completions/${completionId}`;
      const payload = {
        models: [{
          type: "text",
          name: "OPEN_AI_CHATGPT_5_NANO_MODEL"
        }, {
          type: "image",
          name: "FAL_AI_FLUX_SCHNELL_MODEL"
        }, {
          type: "video",
          name: "FAL_AI_PIKA_V2_TURBO_TEXT_TO_VIDEO_MODEL"
        }],
        messages: history,
        properties: {
          image: {
            style: "noStyle",
            aspectRatio: "square",
            numImages: 1
          },
          video: {
            style: "default",
            aspectRatio: "16:9"
          },
          response: {
            followUpQuestions: false,
            length: "AUTO",
            tone: "DEFAULT",
            isTemporaryChat: false
          },
          tools: {
            text2video: {
              mode: "DISABLED"
            }
          }
        },
        ...rest
      };
      this._log("API", "Sending request to completions...");
      const response = await axios.post(url, payload, {
        headers: {
          authorization: `Bearer ${activeToken}`,
          "content-type": "application/json",
          "x-app-origin": "web",
          "x-accept-language": "en",
          origin: this.origin,
          referer: `${this.origin}/`,
          "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"
        }
      });
      let aiContent = "";
      const rawData = response.data;
      if (typeof rawData === "string") {
        const lines = rawData.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.content) aiContent += json.content;
            } catch (e) {}
          }
        }
      } else {
        aiContent = rawData.content || "";
      }
      const assistantMessage = {
        id: completionId,
        content: aiContent,
        role: "assistant",
        model: "OPEN_AI_CHATGPT_5_NANO_MODEL",
        createdAt: Date.now(),
        type: "message",
        parentMessageId: userMsgId
      };
      history.push(assistantMessage);
      this.internalMessages = history;
      this._log("System", "Response AI berhasil diterima.");
      return {
        text: aiContent,
        token: activeToken,
        chatId: this.chatId,
        history: history,
        status: "success"
      };
    } catch (error) {
      this._log("Error", error.response ? `Status: ${error.response.status}` : error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        this._log("System", "Token invalid/expired, mencoba refresh...");
        this.internalToken = null;
        return this.chat({
          token: null,
          prompt: prompt,
          messages: messages,
          ...rest
        });
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ChatGenieAI();
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