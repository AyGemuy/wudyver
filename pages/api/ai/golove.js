import axios from "axios";
import WebSocket from "ws";
import SpoofHead from "@/lib/spoof-head";
class GoloveAI {
  constructor() {
    this.baseURL = "https://api.golove.ai";
    this.wsURL = "wss://api.golove.ai/ws/";
    this.token = null;
    this.ws = null;
    this.pendingResolve = null;
    this.pendingReject = null;
    this.chatId = null;
    this.lastCharacterMessage = null;
  }
  buildHeaders(extra = {}) {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: `Bearer ${this.token || "null"}`,
      "content-type": "application/json",
      origin: "https://golove.ai",
      referer: "https://golove.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead(),
      ...extra
    };
  }
  async auth() {
    if (!this.token) await this.login();
    return this.token;
  }
  async login() {
    try {
      console.log("Logging in...");
      const res = await axios.post(`${this.baseURL}/login/anonymous/register`, {}, {
        headers: this.buildHeaders({
          authorization: "Bearer null"
        })
      });
      this.token = res.data?.token;
      console.log("Login success");
      return res.data;
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      throw error;
    }
  }
  async like(charId, type = "SUPERLIKE") {
    try {
      await this.auth();
      console.log("Liking:", charId);
      const res = await axios.post(`${this.baseURL}/recommendation/feedback`, {
        recommendation_id: charId,
        feedback: type
      }, {
        headers: this.buildHeaders()
      });
      console.log("Like response:", res.data?.type);
      return res.data;
    } catch (error) {
      console.error("Like error:", error.response?.data || error.message);
      throw error;
    }
  }
  parseWebSocketMessage(msg) {
    try {
      if (/^\d+/.test(msg)) {
        const prefixMatch = msg.match(/^(\d+)/);
        const prefix = prefixMatch[1];
        const jsonStr = msg.substring(prefix.length);
        if (jsonStr.trim() === "") {
          return {
            prefix: prefix,
            data: null
          };
        }
        try {
          const data = JSON.parse(jsonStr);
          return {
            prefix: prefix,
            data: data
          };
        } catch {
          return {
            prefix: prefix,
            data: null,
            raw: msg
          };
        }
      }
      try {
        const data = JSON.parse(msg);
        return {
          prefix: null,
          data: data
        };
      } catch {
        return {
          prefix: null,
          data: null,
          raw: msg
        };
      }
    } catch (error) {
      return {
        prefix: null,
        data: null,
        raw: msg,
        error: error.message
      };
    }
  }
  handleWebSocketMessage(parsed) {
    if (parsed.prefix === "42" && Array.isArray(parsed.data)) {
      const [event, payload] = parsed.data;
      if (event === "characterMessage" && payload?.chat_id === this.chatId) {
        console.log("Character message received");
        this.lastCharacterMessage = payload.message;
      } else if (event === "clearChatStatus" && payload === this.chatId) {
        console.log("Clear chat status received - response complete");
        if (this.lastCharacterMessage && this.pendingResolve) {
          this.pendingResolve(this.lastCharacterMessage);
          this.pendingResolve = null;
          this.pendingReject = null;
          this.disconnect();
        }
      }
    } else if (parsed.prefix === "2") {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("3");
      }
    }
  }
  async connectWS() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.wsURL}?token=${this.token}&EIO=4&transport=websocket`;
        console.log("Connecting WS...");
        this.ws = new WebSocket(wsUrl, {
          headers: {
            Origin: "https://golove.ai",
            Connection: "Upgrade",
            Upgrade: "websocket"
          }
        });
        this.ws.on("open", () => {
          console.log("WS connected");
          resolve();
        });
        this.ws.on("message", data => {
          const msg = data.toString();
          console.log("WS received:", msg);
          this.handleWebSocketMessage(this.parseWebSocketMessage(msg));
        });
        this.ws.on("error", error => {
          console.error("WS error:", error);
          this.pendingReject?.(error);
          this.pendingResolve = null;
          this.pendingReject = null;
          reject(error);
        });
        this.ws.on("close", () => {
          console.log("WS disconnected");
          if (this.pendingReject) {
            this.pendingReject(new Error("Connection closed before receiving response"));
            this.pendingResolve = null;
            this.pendingReject = null;
          }
        });
      } catch (error) {
        console.error("WS connect error:", error);
        reject(error);
      }
    });
  }
  async join(chatId) {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.connectWS();
      }
      const msg = `420["joinRoom","${chatId}"]`;
      console.log("Joining room:", chatId);
      this.ws.send(msg);
      await new Promise(resolve => setTimeout(resolve, 1e3));
    } catch (error) {
      console.error("Join error:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    char_id = "324de707-0363-4616-b74b-76052bffde6b",
    ...rest
  }) {
    try {
      this.lastCharacterMessage = null;
      await this.auth();
      const likeRes = await this.like(char_id);
      this.chatId = likeRes?.chat_id;
      if (!this.chatId) throw new Error("No chat ID");
      await this.join(this.chatId);
      const msgPayload = {
        chat_id: this.chatId,
        message: {
          content: prompt
        }
      };
      const msg = `421["sendMessage",${JSON.stringify(msgPayload)}]`;
      console.log("Sending:", prompt);
      this.ws.send(msg);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingResolve = null;
          this.pendingReject = null;
          reject(new Error("Timeout waiting for response (30 seconds)"));
          this.disconnect();
        }, 3e4);
        this.pendingResolve = message => {
          clearTimeout(timeout);
          resolve(message);
        };
        this.pendingReject = error => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      console.error("Chat error:", error);
      this.disconnect();
      throw error;
    }
  }
  async models({
    type = "recommendation"
  } = {}) {
    try {
      await this.auth();
      console.log("Fetching models...");
      const res = await axios.get(`${this.baseURL}/${type}`, {
        headers: this.buildHeaders()
      });
      console.log("Models found:", res.data?.length);
      return res.data;
    } catch (error) {
      console.error("Models error:", error.response?.data || error.message);
      throw error;
    }
  }
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingResolve = null;
    this.pendingReject = null;
    this.lastCharacterMessage = null;
    this.chatId = null;
    console.log("Disconnected");
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
        action: "model | chat"
      }
    });
  }
  const ai = new GoloveAI();
  try {
    let result;
    switch (action) {
      case "model":
        result = await ai.models(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await ai.chat(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: model | chat`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}