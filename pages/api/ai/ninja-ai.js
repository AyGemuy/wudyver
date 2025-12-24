import axios from "axios";
import WebSocket from "ws";
class NinjaAPI {
  constructor() {
    this.accessToken = null;
    this.userId = null;
    this.guestEndpoint = "https://tasks-api.public.prod.myninja.ai/v2/users/guest";
    this.chatEndpoint = "https://comm-bus-api.public.prod.myninja.ai/v1/messages/";
    this.websocketEndpoint = "wss://comm-bus-web.public.prod.myninja.ai/";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://myninja.ai",
      pragma: "no-cache",
      referer: "https://myninja.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.isConnected = false;
    this.ws = null;
    this.finalResult = null;
    this.resultPromiseResolve = null;
  }
  buildHeaders(additionalHeaders = {}) {
    return {
      ...this.defaultHeaders,
      ...additionalHeaders
    };
  }
  async genToken() {
    try {
      const {
        data
      } = await axios.post(this.guestEndpoint, {
        fingerprint: Math.random().toString(36).substring(2, 15)
      }, {
        headers: this.buildHeaders()
      });
      this.accessToken = data.access_token;
      this.userId = data.user.user_id;
      return {
        accessToken: this.accessToken,
        userId: this.userId
      };
    } catch (error) {
      console.error("Gagal mendapatkan token dan user ID:", error);
      throw error;
    }
  }
  async getToUserId() {
    try {
      if (!this.accessToken || !this.userId) {
        await this.genToken();
        if (!this.accessToken || !this.userId) throw new Error("Gagal mendapatkan token atau User ID.");
      }
      return "14a83bbd-7652-4102-ab77-c24ad39701a1";
    } catch (error) {
      console.error("Gagal mendapatkan agent_id (to_user_id):", error);
      return "14a83bbd-7652-4102-ab77-c24ad39701a1";
    }
  }
  async chat({
    prompt = "Hello",
    model = "agent/ninjatech/text-auto",
    toUserId = "14a83bbd-7652-4102-ab77-c24ad39701a1"
  }) {
    try {
      if (!this.accessToken || !this.userId) {
        await this.genToken();
      }
      const targetUserId = toUserId || await this.getToUserId();
      const {
        data
      } = await axios.post(this.chatEndpoint, {
        event_type: "new_message",
        user_id: this.userId,
        channel: ["ce"],
        payload: JSON.stringify({
          conversation_id: "",
          user_id: this.userId,
          from_user_id: this.userId,
          to_user_id: targetUserId,
          channel: "web_app",
          role: "user",
          content: prompt,
          is_read: false,
          tag: "CONVERSATION",
          timestamp: new Date().toISOString(),
          persona: {
            avatar_id: "BP_Atlas_00",
            communication_tone_id: "Professional_And_Formal",
            conversational_style: 3
          },
          payload_list: [{
            payload_type: "text",
            content: prompt
          }, {
            payload_type: "model-selection",
            selected_model: model
          }]
        }),
        streaming: true,
        research_streaming: true
      }, {
        headers: this.buildHeaders({
          authorization: `Bearer ${this.accessToken}`
        })
      });
      return new Promise(async (resolve, reject) => {
        this.resultPromiseResolve = resolve;
        try {
          await this.connectWebSocket(data.payload);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
      throw error;
    }
  }
  async connectWebSocket(payload) {
    if (this.isConnected) return;
    try {
      if (!this.accessToken || !this.userId) {
        await this.genToken();
      }
      const protocols = ["ninja.ws", this.accessToken, this.userId];
      this.ws = new WebSocket(this.websocketEndpoint, protocols);
      this.ws.onopen = () => {
        console.log("WebSocket terhubung.");
        this.isConnected = true;
        this.finalResult = null;
        this.sendPayloadWebSocket(payload);
      };
      this.ws.onmessage = event => {
        const data = JSON.parse(event.data);
        console.log("Menerima pesan WebSocket:", data);
        this.processMessage(data);
      };
      this.ws.onclose = () => {
        console.log("WebSocket terputus.");
        this.isConnected = false;
        this.ws = null;
        this.resultPromiseResolve = null;
      };
      this.ws.onerror = error => {
        console.error("Error WebSocket:", error);
        this.isConnected = false;
        this.ws = null;
        this.resultPromiseResolve = null;
      };
    } catch (error) {
      console.error("Gagal menghubungkan ke WebSocket", error);
      throw error;
    }
  }
  processMessage(message) {
    const {
      event_type,
      payload
    } = message;
    if (event_type === "new_streamable_message_footer") {
      let parsedResult;
      try {
        parsedResult = JSON.parse(payload);
      } catch (e) {
        console.error("Failed to parse payload JSON", e);
        parsedResult = payload;
      }
      this.finalResult = parsedResult;
      console.log("Final Result:", this.finalResult);
      if (parsedResult.is_final_answer === true) {
        this.closeWebSocket();
        if (this.resultPromiseResolve) {
          this.resultPromiseResolve(parsedResult);
          this.resultPromiseResolve = null;
        }
      }
    } else {
      console.log("Other message", message);
    }
  }
  async sendPayloadWebSocket(payload) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket tidak terhubung. Tidak dapat mengirim payload.");
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }
  closeWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
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
    const ninjaAPI = new NinjaAPI();
    const response = await ninjaAPI.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}