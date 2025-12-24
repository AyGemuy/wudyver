import axios from "axios";
import {
  randomBytes
} from "crypto";
class JeevesAI {
  constructor(config = {}) {
    this.config = {
      apiKey: "AIzaSyAk6elDmKNcUhK6aO-OhjHsyIbQc1FiAiU",
      authBaseUrl: "https://identitytoolkit.googleapis.com/v1/",
      apiBaseUrl: "https://api.jeeves.ai",
      baseHeaders: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://jeeves.ai",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      ...config
    };
    this.authClient = axios.create({
      baseURL: this.config.authBaseUrl,
      headers: {
        ...this.config.baseHeaders,
        "content-type": "application/json"
      }
    });
    this.apiClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      headers: {
        ...this.config.baseHeaders,
        "content-type": "application/json"
      }
    });
    this.idToken = null;
    this.email = `${randomBytes(8).toString("hex")}@jeeves.ai`;
    this.password = `JEEVES@${randomBytes(4).toString("hex")}!`;
    this.isInitialized = false;
  }
  async _ensureInit() {
    if (this.isInitialized) return;
    console.log("[PROCESS] Inisialisasi otomatis diperlukan...");
    await this.init();
  }
  async init() {
    console.log("[PROCESS] Memulai inisialisasi klien...");
    try {
      console.log(`[INFO] Mendaftarkan pengguna dengan email: ${this.email}...`);
      const signUpResponse = await this.authClient.post(`accounts:signUp?key=${this.config.apiKey}`, {
        email: this.email,
        password: this.password,
        returnSecureToken: true
      });
      this.idToken = signUpResponse.data?.idToken;
      console.log("[SUCCESS] Pendaftaran berhasil.");
      const displayName = this.email;
      await this.authClient.post(`accounts:update?key=${this.config.apiKey}`, {
        idToken: this.idToken,
        displayName: displayName,
        returnSecureToken: true
      });
      console.log(`[SUCCESS] Profil diperbarui dengan nama: ${displayName}.`);
      this.isInitialized = true;
      console.log("[PROCESS] Klien siap digunakan.");
    } catch (error) {
      this.isInitialized = false;
      console.error("[FATAL] Inisialisasi klien gagal:", error.response?.data?.error?.message || error.message);
      throw error;
    }
  }
  async chat({
    mode = "chat",
    version = "v4",
    prompt,
    messages,
    model,
    parentMessageId,
    conversationId,
    ...rest
  }) {
    await this._ensureInit();
    const authHeader = {
      headers: {
        Authorization: `Bearer ${this.idToken}`
      }
    };
    try {
      switch (mode) {
        case "chat": {
          console.log(`[INFO] Mode 'chat': Mengirim prompt "${prompt}"`);
          const url = `/generate/${version}/${mode}`;
          const payload = {
            messages: version === "v3" ? messages?.length ? messages : [{
              role: "user",
              content: prompt
            }] : undefined,
            model: version === "v3" ? model || "gpt-3.5-turbo" : undefined,
            prompt: version === "v4" ? prompt : undefined,
            parentMessageId: version === "v4" ? parentMessageId : undefined,
            ...rest
          };
          const response = await this.apiClient.post(url, payload, {
            ...authHeader,
            responseType: "stream"
          });
          return this._parseStream(response.data);
        }
        case "conversation": {
          if (!conversationId) throw new Error("Paramenter 'conversationId' diperlukan untuk mode 'conversation'.");
          console.log(`[INFO] Mode 'conversation': Mengambil percakapan ID ${conversationId}`);
          const response = await this.apiClient.get(`/generate/v4/conversation/${conversationId}`, authHeader);
          console.log(`[SUCCESS] Percakapan berhasil diambil.`);
          return response.data;
        }
        case "categories": {
          console.log("[INFO] Mode 'categories': Mengambil semua kategori.");
          const response = await this.apiClient.get("/api/assistant-ai/data/categories", authHeader);
          console.log("[SUCCESS] Kategori berhasil diambil.");
          return response.data;
        }
        case "prompts": {
          console.log("[INFO] Mode 'prompts': Mengambil semua prompt.");
          const response = await this.apiClient.get("/api/assistant-ai/data/prompts", authHeader);
          const processedData = response.data.flatMap(item => item.id ? [item] : [{
            ...item,
            id: item.name.toLowerCase().replace(/ /g, "+")
          }]);
          console.log("[SUCCESS] Prompt berhasil diambil dan diproses.");
          return processedData;
        }
        default:
          throw new Error(`Mode tidak valid: '${mode}'.`);
      }
    } catch (error) {
      console.error(`[ERROR] Gagal menjalankan mode '${mode}':`, error.response?.data?.error?.message || error.message);
      throw error;
    }
  }
  _parseStream(stream) {
    return new Promise((resolve, reject) => {
      let events = [],
        messageId = null,
        finalText = null;
      stream.on("data", chunk => {
        const lines = chunk.toString().split("\n").filter(line => line.startsWith("data: "));
        for (const line of lines) {
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") {
            resolve({
              finalText: finalText,
              messageId: messageId,
              events: events
            });
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            events.push(parsed);
            messageId = parsed?.messageId || messageId;
            if (parsed?.finalText) finalText = parsed.finalText;
          } catch (e) {}
        }
      });
      stream.on("error", err => reject(err));
      stream.on("end", () => {
        if (finalText) resolve({
          finalText: finalText,
          messageId: messageId,
          events: events
        });
      });
    });
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
    const client = new JeevesAI();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}