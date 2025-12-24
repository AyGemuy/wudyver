import axios from "axios";
import WebSocket from "ws";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class FlowGPT {
  constructor() {
    this.base = "https://mobile-backend.flowgpt.com";
    this.wsUrl = "wss://prod-ws-flow-v2.flowgpt.com/socket.io/?EIO=4&transport=websocket";
    this.deviceId = crypto.randomUUID();
    this.ws = null;
    this.convId = null;
    this.callbacks = new Map();
    this.messages = [];
    this.currentChar = null;
    this.responseReceived = false;
  }
  genId() {
    return crypto.randomUUID();
  }
  genHash(data) {
    return crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
  }
  getHeaders() {
    return {
      accept: "application/json",
      "accept-language": "id-ID",
      origin: "https://emochi.com",
      referer: "https://emochi.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "x-flow-device-id": this.deviceId,
      "x-flow-language": "en",
      "x-flow-platform-os": "web",
      ...SpoofHead()
    };
  }
  async search({
    query,
    limit = 20,
    skip = 0,
    ...rest
  }) {
    try {
      console.log(`[Search] Query: "${query}", Limit: ${limit}`);
      const {
        data
      } = await axios.get(`${this.base}/prompt/search`, {
        params: {
          query: query || "",
          threshold: rest.threshold || .8,
          language: rest.language || "id-ID",
          nsfw: rest.nsfw || false,
          take: limit,
          skip: skip,
          deviceType: rest.deviceType || "mobile",
          userAB: rest.userAB || "default"
        },
        headers: this.getHeaders()
      });
      const filtered = (data || []).filter(c => c?.id && c?.title && c?.description).filter(c => c?.live !== false && c?.accessibility !== false).map(c => ({
        id: c.id,
        title: c.title,
        desc: c.description,
        image: c.thumbnailURL || c.coverURL,
        uses: c.conversationCount || c.uses || 0,
        saves: c.saves || 0,
        nsfw: c.nsfw || false,
        tags: c.Tag?.map(t => t.name) || [],
        author: c.User?.name || "Unknown"
      })).sort((a, b) => (b.uses || 0) - (a.uses || 0));
      console.log(`[Search] Found: ${data?.length || 0}, Filtered: ${filtered.length}`);
      return {
        result: filtered,
        total: filtered.length,
        query: query || "",
        success: true
      };
    } catch (e) {
      console.error(`[Search] Error: ${e.message}`);
      return {
        result: [],
        total: 0,
        query: query || "",
        success: false,
        error: e.message
      };
    }
  }
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log("[WS] Connecting...");
        this.ws = new WebSocket(this.wsUrl);
        this.responseReceived = false;
        this.ws.on("open", () => {
          console.log("[WS] Connected");
        });
        this.ws.on("message", msg => {
          const str = msg.toString();
          if (str.startsWith("0{")) {
            const auth = `40${JSON.stringify({
"x-flow-device-id": this.deviceId,
"x-flow-platform-os": "web"
})}`;
            this.ws.send(auth);
            console.log("[WS] Auth sent");
          } else if (str.startsWith("40{")) {
            const sid = JSON.parse(str.substring(2))?.sid || "unknown";
            console.log(`[WS] Authenticated: ${sid}`);
            resolve(true);
          } else if (str.startsWith("42[")) {
            try {
              const [evt, d] = JSON.parse(str.substring(2));
              this.handleEvent(evt, d);
            } catch (e) {
              console.error(`[WS] Parse error: ${e.message}`);
            }
          } else if (str === "2") {
            this.ws.send("3");
          }
        });
        this.ws.on("error", e => {
          console.error(`[WS] Error: ${e.message}`);
          reject(e);
        });
        this.ws.on("close", () => {
          console.log("[WS] Closed");
        });
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error("Connection timeout"));
          }
        }, 1e4);
      } catch (e) {
        console.error(`[WS] Connect error: ${e.message}`);
        reject(e);
      }
    });
  }
  handleEvent(evt, data) {
    if (evt === "typing") {
      const status = data?.status === "start" ? "started" : "stopped";
      console.log(`[WS] Typing ${status}`);
      if (status === "stopped" && this.responseReceived) {
        console.log("[WS] Typing stopped, closing connection...");
        setTimeout(() => this.close(), 100);
      }
    } else if (evt === "chat") {
      console.log(`[WS] Message received`);
      this.responseReceived = true;
      const cb = this.callbacks.get(data?.conversationId);
      if (cb) {
        cb({
          success: true,
          content: data?.content || "",
          id: data?.id,
          time: data?.createdAt
        });
        this.callbacks.delete(data?.conversationId);
      }
    }
  }
  async start({
    char_id,
    ...rest
  }) {
    try {
      console.log(`[Start] Character: ${char_id}`);
      const {
        data
      } = await axios.get(`${this.base}/prompt/${char_id}`, {
        params: {
          enableDisplayWelcomeMessage: rest.showWelcome ?? true
        },
        headers: this.getHeaders()
      });
      const char = data?.prompt;
      if (!char) throw new Error("Character not found");
      this.currentChar = {
        id: char.id,
        title: char.title,
        desc: char.description,
        model: char.model || "EMOCHI_VANILLA",
        temp: char.temperature || .7
      };
      this.convId = this.genId();
      this.callbacks.clear();
      this.responseReceived = false;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.connect();
      }
      const welcome = char.welcomeMessage || char.rawWelcomeMessage || "Hello!";
      this.messages = [{
        role: "assistant",
        content: welcome,
        id: "welcome",
        time: new Date().toISOString()
      }];
      console.log(`[Start] Ready, messages: ${this.messages.length}`);
      return {
        result: {
          char: this.currentChar,
          welcome: welcome,
          messages: [...this.messages]
        },
        convId: this.convId,
        success: true
      };
    } catch (e) {
      console.error(`[Start] Error: ${e.message}`);
      return {
        result: null,
        convId: null,
        success: false,
        error: e.message
      };
    }
  }
  async chat({
    prompt,
    char_id = "Tdenhzxr0xVJYn8kzz6-e",
    ...rest
  }) {
    try {
      if (!this.currentChar || this.currentChar.id !== char_id) {
        console.log("[Chat] Auto starting conversation...");
        const startRes = await this.start({
          char_id: char_id,
          ...rest
        });
        if (!startRes.success) return startRes;
      }
      console.log(`[Chat] Prompt: "${prompt}"`);
      const msgId = this.genId();
      const assistId = this.genId();
      const nonce = this.genId();
      const ts = Math.floor(Date.now() / 1e3);
      const userMsg = {
        role: "user",
        content: prompt || "",
        id: msgId,
        time: new Date().toISOString()
      };
      this.messages.push(userMsg);
      const history = this.messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      const payload = {
        model: rest.model || this.currentChar?.model || "EMOCHI_VANILLA",
        question: prompt || "",
        promptId: char_id,
        conversationId: this.convId,
        messageId: msgId,
        assistantMessageId: assistId,
        history: history,
        deviceId: this.deviceId,
        skipTranslation: rest.skipTranslation ?? true,
        streamReply: rest.streamReply ?? false,
        networkType: rest.networkType || "websocket",
        nsfw: rest.nsfw ?? false,
        temperature: rest.temperature || this.currentChar?.temp || .7,
        generateImage: rest.generateImage ?? false,
        generateAudio: rest.generateAudio ?? false,
        isRegenerate: rest.isRegenerate ?? false,
        autoReply: rest.autoReply ?? false,
        showAdGuide: rest.showAdGuide ?? false
      };
      const sig = this.genHash(payload);
      await axios.post(`${this.base}/chat-v2/chat-anonymous`, payload, {
        headers: {
          ...this.getHeaders(),
          "content-type": "application/json",
          "x-nonce": nonce,
          "x-timestamp": ts.toString(),
          "x-signature": sig
        }
      });
      console.log("[Chat] Waiting response...");
      return new Promise(resolve => {
        this.callbacks.set(this.convId, aiRes => {
          const assistMsg = {
            role: "assistant",
            content: aiRes?.content || "",
            id: aiRes?.id || assistId,
            time: aiRes?.time || new Date().toISOString()
          };
          this.messages.push(assistMsg);
          console.log(`[Chat] Response received, total: ${this.messages.length}`);
          resolve({
            result: {
              user: userMsg,
              assistant: assistMsg,
              messages: [...this.messages]
            },
            convId: this.convId,
            totalMessages: this.messages.length,
            success: true
          });
        });
      });
    } catch (e) {
      console.error(`[Chat] Error: ${e.message}`);
      this.close();
      return {
        result: null,
        convId: this.convId,
        totalMessages: this.messages.length,
        success: false,
        error: e.message
      };
    }
  }
  getMessages() {
    return [...this.messages];
  }
  getChar() {
    return this.currentChar ? {
      ...this.currentChar
    } : null;
  }
  clearHistory() {
    console.log("[Clear] Clearing message history...");
    const welcome = this.messages[0];
    this.messages = welcome ? [welcome] : [];
    console.log(`[Clear] Remaining messages: ${this.messages.length}`);
  }
  close() {
    try {
      console.log("[Close] Closing connection...");
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.convId = null;
      this.callbacks.clear();
      this.messages = [];
      this.currentChar = null;
      this.responseReceived = false;
      console.log("[Close] Done");
    } catch (e) {
      console.error(`[Close] Error: ${e.message}`);
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
      error: "Parameter 'action' wajib diisi",
      actions: ["search", "chat"]
    });
  }
  const api = new FlowGPT();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'"
          });
        }
        result = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'"
          });
        }
        result = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["search", "chat"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}