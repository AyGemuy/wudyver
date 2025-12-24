import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class ShapesChatClient {
  constructor(options = {}) {
    this.baseURL = options?.baseURL || "https://talk.shapes.inc";
    this.apiURL = options?.apiURL || "https://api.shapes.inc";
    this.sessionId = `guest-${uuidv4()}`;
    this.userId = null;
    this.user = null;
    this.chatId = null;
    this.debug = options?.debug || false;
    const spoofIP = this.randomIP();
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      Origin: this.baseURL,
      Referer: `${this.baseURL}/`,
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "X-Forwarded-For": spoofIP,
      "X-Real-IP": spoofIP,
      "CF-Connecting-IP": spoofIP,
      "True-Client-IP": spoofIP,
      ...options?.headers
    };
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: this.headers,
      timeout: options?.timeout || 3e4
    });
    this.shapesApi = axios.create({
      baseURL: this.apiURL,
      headers: {
        ...this.headers,
        "Sec-Fetch-Site": "same-site"
      },
      timeout: options?.timeout || 3e4
    });
  }
  randomIP() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 256)).join(".");
  }
  log(...args) {
    if (this.debug) console.log("[ShapesChat]", ...args);
  }
  error(...args) {
    if (this.debug) console.error("[ShapesChat Error]", ...args);
  }
  genId() {
    return uuidv4();
  }
  parseDynamicData(data) {
    const result = {
      msg_id: data.msgId,
      chat_id: data.chatId,
      time: data.timestamp
    };
    data?.data?.split?.("\n")?.forEach(line => {
      const colonIndex = line.indexOf(":");
      const prefix = colonIndex !== -1 ? line.substring(0, colonIndex) : "";
      const content = colonIndex !== -1 ? line.substring(colonIndex + 1) : "";
      let parsedContent;
      try {
        parsedContent = content ? JSON.parse(content) : null;
      } catch {}
      switch (prefix) {
        case "f":
          Object.assign(result, parsedContent);
          break;
        case "0":
          result.arr = [...result.arr || [], content.replace(/"/g, "")];
          break;
        case "e":
          result.reason = [...result.reason || [], parsedContent];
          break;
        case "2":
          parsedContent?.forEach?.(item => {
            const typeKey = item.type?.replaceAll("-", "_");
            const value = {
              ...item
            };
            delete value.type;
            if (item.metadata) {
              result.metadata = {
                ...result.metadata || {},
                ...value.metadata
              };
            } else if (item.textParts) {
              result.part = item.textParts[0]?.text || "";
            } else {
              result[typeKey] = Object.entries(value).reduce((acc, [k, v]) => {
                const snakeKey = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
                return {
                  ...acc,
                  [snakeKey]: v
                };
              }, {});
            }
          });
          break;
      }
    });
    return result;
  }
  async getShape(name = "qwen-chat") {
    try {
      this.log(`Getting shape info for: ${name}`);
      const res = await this.shapesApi.get(`/shapes/public/${name}`);
      this.log(`Shape info retrieved:`, res?.data?.name || "unknown");
      return res?.data || {};
    } catch (err) {
      this.error("Failed to get shape info:", err?.message);
      return {
        error: err?.message || "Unknown error"
      };
    }
  }
  async createUser() {
    try {
      this.log("Creating guest user...");
      const res = await this.api.post("/api/user/guest/get-or-create", {}, {
        headers: {
          "Content-Type": "application/json",
          Cookie: `guest-session-id=${this.sessionId}; sidebar:state=false`
        }
      });
      this.user = res?.data || {};
      this.userId = this.user?.id || null;
      this.log(`User created: ${this.user?.displayName || "unknown"}`);
      return this.user;
    } catch (err) {
      this.error("Failed to create user:", err?.message);
      return {
        error: err?.message || "Failed to create user"
      };
    }
  }
  async init() {
    try {
      if (!this.user) {
        const result = await this.createUser();
        if (result?.error) return result;
      }
      return this.user;
    } catch (err) {
      this.error("Initialization failed:", err?.message);
      return {
        error: err?.message || "Initialization failed"
      };
    }
  }
  async uploadMedia(media) {
    try {
      const isBase64 = /^data:.*;base64,/.test(media) || /^[A-Za-z0-9+/=]+$/.test(media);
      const filename = `IMG-${Date.now()}.jpg`;
      const tokenRes = await this.api.post("/api/files/upload", {
        type: "blob.generate-client-token",
        payload: {
          pathname: filename,
          callbackUrl: `${this.baseURL}/api/files/upload`,
          clientPayload: null,
          multipart: false
        }
      }, {
        headers: {
          "Content-Type": "application/json",
          Cookie: `guest-session-id=${this.sessionId}; sidebar:state=false`
        }
      });
      const clientToken = tokenRes?.data?.clientToken;
      if (!clientToken) throw new Error("Gagal ambil clientToken");
      let buffer;
      if (isBase64) buffer = Buffer.from(media.replace(/^data:.*;base64,/, ""), "base64");
      else {
        const resp = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = resp?.data;
      }
      const uploadUrl = `https://blob.vercel-storage.com/${filename}`;
      await axios.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          Authorization: `Bearer ${clientToken}`
        }
      });
      const publicUrl = uploadUrl.replace("blob.vercel-storage.com", `${clientToken.split(".")[0]}.public.blob.vercel-storage.com`);
      this.log("Media uploaded:", publicUrl);
      return {
        url: publicUrl,
        name: filename,
        contentType: "image/jpeg"
      };
    } catch (err) {
      this.error("Upload media gagal:", err?.message);
      return null;
    }
  }
  async chat({
    prompt = "",
    model = "shapesinc/qwen-chat",
    visibility = "private",
    media,
    ...rest
  } = {}) {
    try {
      this.log(`Sending message: "${prompt?.slice(0, 50) || ""}..."`);
      const initResult = await this.init();
      if (initResult?.error) return {
        success: false,
        error: initResult.error
      };
      const chatId = this.chatId || this.genId();
      const msgId = this.genId();
      const timestamp = new Date().toISOString();
      let attachments = [];
      if (media) {
        const uploaded = await this.uploadMedia(media);
        if (uploaded) attachments.push(uploaded);
      }
      const payload = {
        id: chatId,
        message: {
          role: "user",
          content: prompt || "",
          experimental_attachments: attachments.length ? attachments : undefined,
          id: msgId,
          createdAt: timestamp,
          parts: [{
            type: "text",
            text: prompt || ""
          }]
        },
        selectedChatModel: model || "shapesinc/qwen-chat",
        selectedVisibilityType: visibility || "private",
        initialInterlocutors: [model || "shapesinc/qwen-chat"],
        ...rest
      };
      this.chatId = chatId;
      const res = await this.api.post("/api/chat", payload, {
        headers: {
          "Content-Type": "application/json",
          Cookie: `guest-session-id=${this.sessionId}; sidebar:state=false`,
          Referer: `${this.baseURL}/${model?.split("/")?.[1] || "chat"}/dm`
        }
      });
      this.log("Message sent successfully");
      return this.parseDynamicData({
        msgId: msgId,
        chatId: chatId,
        timestamp: timestamp,
        data: res?.data || ""
      });
    } catch (err) {
      this.error("Chat failed:", err?.message);
      return {
        success: false,
        error: err?.message || "Chat failed",
        details: err?.response?.data || null
      };
    }
  }
  async send(prompt = "", options = {}) {
    try {
      return await this.chat({
        prompt: prompt,
        ...options
      });
    } catch (err) {
      this.error("Send failed:", err?.message);
      return {
        success: false,
        error: err?.message || "Send failed"
      };
    }
  }
  async newChat() {
    try {
      this.chatId = null;
      const newId = this.genId();
      this.log(`Starting new chat: ${newId}`);
      return newId;
    } catch (err) {
      this.error("New chat failed:", err?.message);
      return null;
    }
  }
  getModels() {
    return ["shapesinc/qwen-chat"];
  }
  getChatId() {
    return this.chatId;
  }
  getUser() {
    return this.user;
  }
  setDebug(enabled = true) {
    this.debug = enabled;
    this.log(`Debug mode: ${enabled ? "enabled" : "disabled"}`);
  }
  setHeaders(headers = {}) {
    try {
      this.headers = {
        ...this.headers,
        ...headers
      };
      this.api.defaults.headers = {
        ...this.api.defaults.headers,
        ...headers
      };
      this.shapesApi.defaults.headers = {
        ...this.shapesApi.defaults.headers,
        ...headers
      };
      this.log("Headers updated");
    } catch (err) {
      this.error("Failed to set headers:", err?.message);
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
    const client = new ShapesChatClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}