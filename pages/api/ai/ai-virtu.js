import fetch from "node-fetch";
import crypto from "crypto";
import FormData from "form-data";
const DEFAULTS = {
  baseURL: "https://api-chatbot-ai.aperogroup.ai/",
  apiKey: "sk-MFBX2yDGuYZygMN97ArFIe00u8jdmaCtWzpKlDT5hd6nHGIKgN",
  bundleId: "com.aichat.chatbot.aiassistant",
  appName: "TeraBot",
  publicKey: `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz+zgKEmqyK5HHtvryJ3pEIjaK+gXMYw/CEBZIzRmis7pxFoHTq9eMZHwPLohKiCJKvXZdtXJltkIW8glyVmgw0Fh6apRV/pvd8VYnphz1v+5pKgDIltCrbNrLKCuxX/bo6/3Z2Gz5xsm0xyB3c3sEtdpRmUK19W2hRK46/c5PKeNbn/OD5Ike5go4gTLaFwEC8XpvxrAfyxqO7ahbJlLqkO8DUwEK7y+NhRTgu+1/n2vxSsmoynwPA18ZSsSBqC+lta+E0dxqlvbeuz736aGbu4EVvRr/WGxg6/mbvb7kfBcyz/OwSQhrjd5lAsKOpP1VVbBSxDSU0f/TecipUzIuQIDAQAB\n-----END PUBLIC KEY-----`
};
class ApiVirtuAI {
  constructor(config = {}) {
    this.config = {
      ...DEFAULTS,
      ...config
    };
    this.accessToken = config.token || null;
    this.refreshToken = config.refreshToken || null;
    this.isRefreshing = false;
    console.log("[PROSES] Instance ApiVirtuAI dibuat.");
  }
  async generate({
    token = null,
    mode = "chat",
    ...rest
  }) {
    const startTime = Date.now();
    try {
      if (token) {
        this.accessToken = token;
      }
      await this._ensureAuth();
      let resultData;
      switch (mode) {
        case "chat":
          resultData = await this._chat(rest);
          break;
        case "image":
          resultData = await this._image(rest);
          break;
        default:
          throw new Error(`Mode '${mode}' tidak valid. Gunakan 'chat' atau 'image'.`);
      }
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1e3;
      return {
        ...resultData,
        token: this.accessToken,
        time: {
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
          duration: `${duration.toFixed(2)} detik`
        },
        conversation: {
          id: resultData.conversationId
        }
      };
    } catch (error) {
      console.error(`[GAGAL] Operasi generate (mode: ${mode}) gagal:`, error.message);
      throw error;
    }
  }
  async _chat({
    prompt,
    botCode = "ai-virtu",
    conversationId = null,
    persist = true,
    fileUrls = null
  }) {
    if (!prompt) throw new Error("Prompt is required");
    const targetConversationId = await this._getOrCreateConversation(botCode, conversationId);
    let processedFileUrls = null;
    if (fileUrls) {
      processedFileUrls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
    }
    const payload = {
      question: prompt.trim(),
      persist: persist,
      conversationId: targetConversationId,
      fileUrls: processedFileUrls
    };
    const endpoint = `api/v1/ai-virtu/${botCode}/ask-sse`;
    const response = await this._apiRequest("POST", endpoint, {
      body: JSON.stringify(payload)
    });
    const messageResult = await this._processSSEStream(response);
    return {
      result: messageResult,
      conversationId: targetConversationId
    };
  }
  async _image({
    prompt,
    botCode = "ai-virtu",
    conversationId = null,
    persist = true,
    fileUrls = null
  }) {
    if (!prompt) throw new Error("Prompt is required for image generation");
    const targetConversationId = await this._getOrCreateConversation(botCode, conversationId);
    let processedFileUrls = null;
    if (fileUrls) {
      processedFileUrls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
    }
    const payload = {
      question: prompt.trim(),
      conversationId: targetConversationId,
      persist: persist,
      fileUrls: processedFileUrls
    };
    const endpoint = `api/v1/ai-virtu/${botCode}/generate-image`;
    const response = await this._apiRequest("POST", endpoint, {
      body: JSON.stringify(payload)
    });
    return {
      result: response,
      conversationId: targetConversationId
    };
  }
  async _apiRequest(method, endpoint, options = {}) {
    try {
      const signatureHeaders = await this._createSignatureHeaders();
      const url = `${this.config.baseURL}${endpoint}`;
      const headers = {
        ...signatureHeaders,
        ...options.headers
      };
      if (this.accessToken) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
      }
      const requestConfig = {
        method: method,
        headers: headers,
        ...options
      };
      console.log(`[REQUEST] ${method} ${url}`);
      const response = await fetch(url, requestConfig);
      console.log(`[RESPONSE] ${endpoint}: Status ${response.status} ${response.statusText}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[RESPONSE ERROR] ${endpoint}:`, errorText);
        const error = new Error(`HTTP Error: ${response.status} - ${errorText}`);
        error.status = response.status;
        throw error;
      }
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        return response;
      }
      return await response.json();
    } catch (error) {
      if (error.status === 401 && !this.isRefreshing) {
        console.log("[PROSES] Token tidak valid. Mencoba refresh...");
        const refreshed = await this._refreshToken();
        if (refreshed) {
          console.log("[PROSES] Token diperbarui. Mengulang request...");
          return this._apiRequest(method, endpoint, options);
        }
      }
      console.error(`[GAGAL] Panggilan API ke '${endpoint}' gagal:`, error.message);
      throw error;
    }
  }
  async _ensureAuth() {
    if (this.accessToken) return;
    console.log("[PROSES] Token tidak ditemukan. Menjalankan sign-up...");
    await this.signUp();
  }
  async signUp({
    referId = "ai-virtu",
    applicationCode = "ai-virtu"
  } = {}) {
    try {
      const signatureHeaders = await this._createSignatureHeaders();
      const url = `${this.config.baseURL}api/v1/auth/sign-up`;
      const response = await fetch(url, {
        method: "POST",
        headers: signatureHeaders,
        body: JSON.stringify({
          referId: referId,
          applicationCode: applicationCode
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sign-up failed: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      const tokens = data?.data?.token;
      if (tokens?.accessToken) {
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        console.log("[SUKSES] Sign-up berhasil.");
        return data;
      } else {
        throw new Error("Respons sign-up tidak valid.");
      }
    } catch (error) {
      console.error("[GAGAL] Operasi signUp gagal:", error);
      throw error;
    }
  }
  async _refreshToken() {
    if (!this.refreshToken) {
      console.log("[INFO] Tidak ada refresh token untuk digunakan.");
      return false;
    }
    this.isRefreshing = true;
    try {
      const signatureHeaders = await this._createSignatureHeaders();
      const url = `${this.config.baseURL}api/v1/auth/refresh`;
      const response = await fetch(url, {
        method: "POST",
        headers: signatureHeaders,
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });
      if (!response.ok) {
        throw new Error(`Refresh token failed: ${response.status}`);
      }
      const data = await response.json();
      const newTokens = data?.data?.token || data?.data;
      if (newTokens?.accessToken) {
        this.accessToken = newTokens.accessToken;
        this.refreshToken = newTokens.refreshToken || this.refreshToken;
        console.log("[SUKSES] Refresh token berhasil.");
        return true;
      } else {
        throw new Error("Respons refresh tidak mengandung accessToken.");
      }
    } catch (error) {
      console.error("[GAGAL] Gagal me-refresh token:", error.message);
      this.accessToken = null;
      this.refreshToken = null;
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }
  async _createSignatureHeaders() {
    try {
      const timestamp = await this._fetchServerTimestamp();
      const randomNumber = Math.floor(Math.random() * 1e6);
      const {
        apiKey,
        publicKey,
        bundleId,
        appName
      } = this.config;
      const plainText = `${timestamp}@@@${apiKey}@@@${randomNumber}`;
      const encrypted = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(plainText));
      const signature = encrypted.toString("base64");
      return {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-signature": signature,
        "x-api-timestamp": String(timestamp),
        "x-api-bundleId": bundleId,
        "app-name": appName
      };
    } catch (error) {
      console.error("[FATAL] Gagal membuat signature header:", error);
      throw error;
    }
  }
  async _fetchServerTimestamp() {
    try {
      const response = await fetch(`${this.config.baseURL}api/timestamp`);
      if (response.ok) {
        const data = await response.json();
        if (data?.data?.timestamp) {
          return data.data.timestamp;
        }
      }
    } catch (error) {
      console.log("[INFO] Gagal mendapatkan server timestamp, menggunakan waktu lokal.");
    }
    return Date.now();
  }
  async _getOrCreateConversation(botCode, conversationId) {
    if (conversationId) return conversationId;
    console.log("[PROSES] Membuat conversation baru...");
    const endpoint = `api/v1/ai-virtu/${botCode}-message/conversation`;
    const response = await this._apiRequest("POST", endpoint);
    const newId = response?.data?.id || response?.data?.conversationId;
    if (!newId) throw new Error("Gagal membuat conversation baru.");
    console.log("[SUKSES] Conversation dibuat dengan ID:", newId);
    return newId;
  }
  async _processSSEStream(response) {
    return new Promise((resolve, reject) => {
      if (!response.body) {
        return reject(new Error("Response body is null"));
      }
      let fullMessage = "";
      let buffer = "";
      console.log("[SSE] Memulai proses stream...");
      response.body.on("data", chunk => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.message) {
                fullMessage += data.message;
                process.stdout.write(data.message);
              }
            } catch (e) {
              console.error("[SSE WARN] Gagal parsing data JSON:", dataStr);
            }
          }
        }
      });
      response.body.on("end", () => {
        console.log("\n[SSE] Stream selesai.");
        resolve(fullMessage);
      });
      response.body.on("error", err => {
        console.error("[SSE GAGAL] Terjadi error pada stream:", err);
        reject(err);
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
    const api = new ApiVirtuAI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}