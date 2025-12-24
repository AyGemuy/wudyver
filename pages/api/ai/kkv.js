import axios from "axios";
import https from "https";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class KKV_AI {
  constructor() {
    console.log("[PROSES] Menginisialisasi instance KKV_AI...");
    this.baseUrl = "https://kkv.ai";
    this.cookies = {};
    this.email = `${this.randomID(8)}@mail.com`;
    this.password = `${this.randomID(10)}#@!`;
    console.log(`[PROSES] Kredensial instance dibuat: ${this.email}`);
    this.isRegistered = false;
    const httpsAgent = new https.Agent({
      port: 443,
      rejectUnauthorized: false,
      keepAlive: true,
      keepAliveMsecs: 1e3
    });
    this.axiosInstance = axios.create({
      baseURL: `${this.baseUrl}/api/`,
      httpsAgent: httpsAgent,
      timeout: 9e4
    });
    this.setupInterceptors();
    console.log("[PROSES] Inisialisasi selesai. Siap digunakan.");
  }
  async _ensureRegistered() {
    if (this.isRegistered) {
      return;
    }
    console.log("[PROSES] Sesi belum terdaftar. Menjalankan registrasi otomatis...");
    await this.register();
    this.isRegistered = true;
    console.log("✅ Registrasi otomatis berhasil. Sesi sekarang aktif.");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      platform: "PC",
      product: "KKV_AI",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
    console.log("[PROSES] Header dinamis telah dibangun.");
    return headers;
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      const cookieString = Object.entries(this.cookies).filter(([_, value]) => value).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookieString) {
        console.log("[PROSES] Menambahkan cookie ke permintaan...");
        config.headers["Cookie"] = cookieString;
      }
      return config;
    }, error => Promise.reject(error));
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        console.log("[PROSES] Menangkap 'set-cookie' dari respons server.");
        console.log("[DATA] Header 'set-cookie' diterima:", setCookieHeader);
        setCookieHeader.forEach(cookieStr => {
          const [cookiePair] = cookieStr.split(";");
          const [key, value] = cookiePair.split("=");
          if (key && value) this.cookies[key.trim()] = value.trim();
        });
      }
      return response;
    }, error => Promise.reject(error));
    console.log("[PROSES] Interceptor berhasil disiapkan.");
  }
  async register() {
    try {
      console.log(`[PROSES] Memulai proses registrasi untuk ${this.email}...`);
      const headers = this.buildHeaders({
        "content-type": "application/json",
        referer: `${this.baseUrl}/auth/sign-up`
      });
      const response = await this.axiosInstance.post("/auth/register", {
        email: this.email,
        password: this.password
      }, {
        headers: headers
      });
      console.log("[DATA] Respons dari /auth/register:", JSON.stringify(response.data, null, 2));
      if (response.data.code !== 0) throw new Error(`Registrasi gagal: ${response.data.message}`);
      return response.data;
    } catch (error) {
      console.error(`[Error di KKV_AI.register]`, error.message);
      throw error;
    }
  }
  async image({
    prompt,
    key = "flux-schnell-v2",
    ...rest
  }) {
    try {
      await this._ensureRegistered();
      console.log(`[PROSES] Memulai proses pembuatan gambar dengan prompt: "${prompt}"...`);
      const headers = this.buildHeaders({
        "content-type": "application/json",
        referer: `${this.baseUrl}/image`
      });
      const payload = {
        key: key,
        prompt: prompt,
        ...rest
      };
      const response = await this.axiosInstance.post("/image/v2/predict", payload, {
        headers: headers
      });
      console.log("[DATA] Respons dari /image/v2/predict:", JSON.stringify(response.data, null, 2));
      if (response.data.code !== 0) throw new Error(`Pembuatan gambar gagal: ${response.data.message}`);
      return response.data;
    } catch (error) {
      console.error(`[Error di KKV_AI.image]`, error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    apiId = "1f1990eb-bba3-4496-aa8a-3d071eb885ee",
    ...rest
  }) {
    try {
      await this._ensureRegistered();
      console.log("[PROSES] Memulai alur chat...");
      console.log("[PROSES] Langkah 1: Mengirim permintaan ke /chat/new untuk memulai sesi.");
      const headersNew = this.buildHeaders({
        "content-type": "application/json",
        referer: `${this.baseUrl}/chat`
      });
      const newChatResponse = await this.axiosInstance.post("/chat/new", {
        apiId: apiId,
        content: prompt,
        ...rest
      }, {
        headers: headersNew
      });
      console.log("[DATA] Respons dari /chat/new:", JSON.stringify(newChatResponse.data, null, 2));
      if (newChatResponse.data.code !== 0) throw new Error(`Gagal membuat chat baru: ${newChatResponse.data.message}`);
      const {
        chat,
        message
      } = newChatResponse.data.data;
      console.log(`[PROSES] Langkah 2: Mengirim pesan ke /chat/conversation dengan chatId: ${chat.chatId}`);
      const headersConv = this.buildHeaders({
        accept: "*/*",
        referer: `${this.baseUrl}/chat/${chat.chatId}`
      });
      const conversationPayload = {
        apiId: chat.apiId,
        chatId: chat.chatId,
        messages: [{
          messageId: message.messageId,
          role: "user",
          content: message.content
        }]
      };
      const conversationResponse = await this.axiosInstance.post("/chat/conversation", conversationPayload, {
        headers: headersConv
      });
      console.log("[DATA] Respons mentah dari /chat/conversation diterima.");
      console.log("[PROSES] Mem-parsing data respons dari /chat/conversation...");
      const rawData = conversationResponse.data;
      let result = "",
        messageId = null,
        parentId = null,
        status = null;
      const arrayResult = [];
      if (typeof rawData === "string") {
        const lines = rawData.trim().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.substring(5).trim();
              if (jsonStr) {
                const dataObj = JSON.parse(jsonStr);
                arrayResult.push(dataObj);
                if (dataObj.content) result += dataObj.content;
                if (!messageId && dataObj.messageId) messageId = dataObj.messageId;
                if (!parentId && dataObj.parentId) parentId = dataObj.parentId;
                if (dataObj.status) status = dataObj.status;
              }
            } catch (e) {}
          }
        }
      }
      const finalResultObject = {
        result: result,
        messageId: messageId,
        parentId: parentId,
        status: status,
        arrayResult: arrayResult
      };
      console.log("[PROSES] Parsing selesai.");
      console.log(`[DATA] Objek hasil akhir: { result: "${result.substring(0, 50)}...", messageId: "${messageId}", status: "${status}" }`);
      return finalResultObject;
    } catch (error) {
      console.error(`[Error di KKV_AI.chat]`, error.message);
      throw error;
    }
  }
  async getChatHistory() {
    try {
      await this._ensureRegistered();
      console.log("[PROSES] Memulai proses pengambilan riwayat chat...");
      const headers = this.buildHeaders({
        referer: `${this.baseUrl}/chat`
      });
      const response = await this.axiosInstance.post("/chat/chats", null, {
        headers: headers
      });
      console.log("[DATA] Respons dari /chat/chats:", JSON.stringify(response.data, null, 2));
      if (response.data.code !== 0) throw new Error(`Gagal mengambil riwayat chat: ${response.data.message}`);
      return response.data.data;
    } catch (error) {
      console.error(`[Error di KKV_AI.getChatHistory]`, error.message);
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
  const api = new KKV_AI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await api[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await api[action](params);
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