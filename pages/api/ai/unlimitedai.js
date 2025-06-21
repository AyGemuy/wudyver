import axios from "axios";
import crypto from "crypto";
class UnlimitedAIChat {
  constructor() {
    this.apiToken = null;
    this.baseURL = "https://app.unlimitedai.chat/api";
    this._ensureToken();
  }
  async _ensureToken() {
    if (!this.apiToken) {
      try {
        await this.getToken();
      } catch (error) {
        console.error("Gagal mendapatkan token saat inisialisasi:", error);
      }
    }
  }
  async getToken() {
    try {
      const response = await axios.get(`${this.baseURL}/token`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://app.unlimitedai.chat/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      this.apiToken = response.data.token;
      return this.apiToken;
    } catch (error) {
      console.error("Gagal mendapatkan token:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    chat_id = crypto.randomUUID(),
    model = "chat-model-reasoning",
    messages
  }) {
    await this._ensureToken();
    const messagePayload = messages?.length ? messages : prompt ? [{
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      role: "user",
      content: prompt,
      parts: [{
        type: "text",
        text: prompt
      }]
    }] : (() => {
      throw new Error("Anda harus menyediakan prompt atau array messages.");
    })();
    const payload = {
      id: chat_id,
      messages: messagePayload,
      selectedChatModel: model
    };
    try {
      const response = await axios.post(`${this.baseURL}/chat`, payload, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://app.unlimitedai.chat",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `https://app.unlimitedai.chat/chat/${chat_id}`,
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-api-token": this.apiToken
        },
        transformResponse: [data => {
          if (typeof data === "string") {
            return this.processString(data);
          }
          return data;
        }]
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
      throw error;
    }
  }
  processString(s) {
    try {
      const l = s.split("\n").filter(line => line.trim() !== "");
      let m = null,
        i = false,
        r = "";
      l.forEach(line => {
        line.startsWith("f:") ? (() => {
          try {
            m = JSON.parse(line.substring(2)).messageId;
          } catch (e) {}
        })() : line.startsWith("e:") ? (() => {
          try {
            i = JSON.parse(line.substring(2)).isContinued;
          } catch (e) {}
        })() : !line.startsWith("d:") ? (() => {
          const c = line.indexOf(":");
          const v = c > 0 ? line.substring(c + 1).trim() : line.trim();
          r += v.length > 1 ? v.slice(1, -1) : v;
        })() : null;
      });
      const finalResult = r.replace(/\\\\n/g, "\\n");
      return {
        result: finalResult,
        msg_id: m,
        is_continue: i
      };
    } catch (e) {
      return {
        result: `Error: ${e.message}`,
        msg_id: null,
        is_continue: false
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const chatClient = new UnlimitedAIChat();
  try {
    const data = await chatClient.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}