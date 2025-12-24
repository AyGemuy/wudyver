import axios from "axios";
import crypto from "crypto";
const apiHosts = ["api.aianychat.top", "ailink.funnyai.top", "api.stargirlai.top", "api.sayhichat.top"];
class SayHiApi {
  constructor({
    hostIndex,
    timeout = 36e4
  } = {}) {
    let selectedHost;
    const hostIdx = parseInt(hostIndex, 10);
    if (!isNaN(hostIdx) && hostIdx >= 0 && hostIdx < apiHosts.length) {
      selectedHost = apiHosts[hostIdx];
      console.log(`🔧 Host dipilih berdasarkan index [${hostIdx}]: ${selectedHost}`);
    } else {
      const randomIndex = Math.floor(Math.random() * apiHosts.length);
      selectedHost = apiHosts[randomIndex];
      console.log(`🔁 Host dipilih secara acak [${randomIndex}]: ${selectedHost}`);
    }
    const baseURL = `https://${selectedHost}/honey/`;
    this.client = axios.create({
      baseURL: baseURL,
      timeout: timeout
    });
    this.encryptionKey = this.genKey(baseURL);
    this.accessToken = "";
    this.setupInterceptors();
  }
  genKey(baseUrl) {
    const urlPart = baseUrl.split("://")[1] || "api.sayhichat.top";
    const substring = urlPart.substring(3, 8);
    return `\u0000\u0000\u0000${substring}\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000`;
  }
  genDevice() {
    const deviceId = crypto.randomBytes(16).toString("hex");
    const timezoneOffset = new Date().getTimezoneOffset() / -60;
    const timezone = `GMT${timezoneOffset >= 0 ? "+" : ""}${timezoneOffset}`;
    return {
      deviceId: deviceId,
      deviceName: "NodeJS-Client",
      simCountry: "US",
      isVpn: 0,
      dModel: "NodeJS-Client",
      sysVersion: "18.0.0",
      deviceLang: "en",
      timezone: timezone,
      referrer: ""
    };
  }
  encrypt(data) {
    try {
      const key = Buffer.from(this.encryptionKey, "utf8");
      const iv = Buffer.from(this.encryptionKey, "utf8");
      const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
      cipher.setAutoPadding(true);
      let encrypted = cipher.update(data, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (error) {
      console.error("Encryption error:", error.message);
      return "";
    }
  }
  decrypt(encryptedBase64) {
    try {
      const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
      const key = Buffer.from(this.encryptionKey, "utf8");
      const iv = Buffer.from(this.encryptionKey, "utf8");
      const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
      decipher.setAutoPadding(true);
      let decrypted = decipher.update(encryptedBuffer, "binary", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error.message);
      return null;
    }
  }
  genHeaders() {
    const deviceInfo = this.genDevice();
    return {
      "access-token": this.accessToken || "",
      "d-id": deviceInfo.deviceId,
      version: "2.6.7",
      "app-name": "sayhi-android",
      lang: deviceInfo.deviceLang,
      sim_country: deviceInfo.simCountry,
      is_vpn: deviceInfo.isVpn.toString(),
      "d-model": deviceInfo.dModel,
      sys_version: deviceInfo.sysVersion,
      timezone: deviceInfo.timezone
    };
  }
  setupInterceptors() {
    this.client.interceptors.request.use(config => {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      config.headers = {
        ...config.headers,
        ...this.genHeaders()
      };
      if (config.method?.toLowerCase() === "post" && config.data) {
        config.data = this.prepareReq(config.data);
        config.headers["Content-Type"] = "application/json";
      }
      return config;
    }, error => {
      console.error("❌ Request error:", error.message);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      console.log(`✅ ${response.status} ${response.config.url}`);
      if (response.config.url.startsWith("bot/chat_new")) {
        console.log("📦 Chat response, skipping decryption in interceptor.");
        return response;
      }
      if (response.data) {
        try {
          const decrypted = this.decryptRes(response.data);
          response.data = decrypted;
          console.log("🔓 Hasil dekripsi:", decrypted);
        } catch (error) {
          console.warn("⚠️ Gagal memproses response:", error.message);
        }
      }
      return response;
    }, error => {
      console.error("❌ Response error:", error.message);
      return Promise.reject(error);
    });
  }
  prepareReq(originalData) {
    try {
      const headerData = this.genHeaders();
      const paramData = Object.keys(originalData).length > 0 ? originalData : {};
      const requestMap = {
        header: headerData,
        param: paramData
      };
      console.log("📤 Data request sebelum enkripsi:", requestMap);
      const jsonString = JSON.stringify(requestMap);
      const encryptedData = this.encrypt(jsonString);
      const finalPayload = {
        data: Buffer.from(encryptedData).toString("base64")
      };
      console.log("🔐 Data request setelah enkripsi:", finalPayload);
      return finalPayload;
    } catch (error) {
      console.error("Request preparation error:", error.message);
      return originalData;
    }
  }
  decryptRes(responseData) {
    try {
      let dataToDecrypt = "";
      if (typeof responseData === "string") {
        dataToDecrypt = Buffer.from(responseData, "base64").toString("utf8");
      } else if (typeof responseData === "object" && responseData.data) {
        dataToDecrypt = Buffer.from(responseData.data, "base64").toString("utf8");
      } else {
        return responseData;
      }
      const decrypted = this.decrypt(dataToDecrypt);
      if (decrypted) {
        try {
          return JSON.parse(decrypted);
        } catch (parseError) {
          return decrypted;
        }
      }
      return responseData;
    } catch (error) {
      console.error("❌ Error processing response:", error.message);
      return responseData;
    }
  }
  setToken(token) {
    this.accessToken = token;
    console.log("🔑 Access token telah disimpan.");
  }
  async login() {
    console.log("👤 Memulai guest login...");
    try {
      const deviceInfo = this.genDevice();
      const loginData = {
        third_token: "",
        third_platform: "visitor",
        email: "",
        password: "",
        third_did: deviceInfo.deviceId,
        d_name: deviceInfo.deviceName,
        sim_country: deviceInfo.simCountry,
        is_vpn: deviceInfo.isVpn,
        d_model: deviceInfo.dModel,
        sys_version: deviceInfo.sysVersion,
        lang: deviceInfo.deviceLang,
        timezone: deviceInfo.timezone,
        referrer: deviceInfo.referrer
      };
      const response = await this.client.post("u/login", loginData);
      const responseData = response.data;
      const token = responseData?.data?.token;
      if (token) {
        this.setToken(token);
        console.log("✅ Guest login berhasil.");
      } else {
        console.error("❌ Token tidak ditemukan.");
      }
      return {
        success: !!token,
        data: responseData,
        token: token
      };
    } catch (error) {
      console.error("❌ Guest login gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  async getUser() {
    console.log("ℹ️ Mendapatkan info user...");
    try {
      const response = await this.client.post("u/info", {});
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error("❌ Gagal mendapatkan info user:", error.response?.data || error.message);
      throw error;
    }
  }
  async search({
    keyword,
    page = 1,
    size = 20
  } = {}) {
    await this.login();
    console.log(`🔍 Mencari bot: "${keyword}"`);
    try {
      const response = await this.client.post("bot/search", {
        keyword: keyword,
        page: page,
        size: size
      });
      return {
        success: true,
        data: response.data,
        searchTerm: keyword
      };
    } catch (error) {
      console.error("❌ Pencarian bot gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  parseChatResponse(rawData) {
    if (typeof rawData !== "string") return {
      result: "",
      chunks: [],
      rest: {}
    };
    const lines = rawData.trim().split("\n");
    const chunks = [];
    let result = "";
    let rest = {};
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const jsonStr = line.substring(6);
          const parsed = JSON.parse(jsonStr);
          chunks.push(parsed);
          const content = parsed?.choices?.[0]?.delta?.content;
          if (content) {
            result += content;
          }
          if (parsed.id) rest = {
            ...rest,
            ...parsed
          };
        } catch (e) {}
      }
    }
    delete rest.choices;
    delete rest.obfuscation;
    return {
      result: result,
      chunks: chunks,
      ...rest
    };
  }
  async chat({
    prompt,
    botId = "12081179",
    isStream = true
  } = {}) {
    await this.login();
    console.log(`💬 Mengirim chat ke bot ${botId}: "${prompt}" (Stream: ${isStream})`);
    try {
      const deviceInfo = this.genDevice();
      const params = new URLSearchParams({
        q: prompt,
        bot_id: botId,
        lang: deviceInfo.deviceLang,
        is_stream: isStream ? "1" : "0"
      });
      const url = `bot/chat_new?${params.toString()}`;
      console.log("📡 URL chat:", url);
      const response = await this.client.get(url);
      let finalData;
      if (isStream) {
        console.log("📊 Parsing stream response...");
        finalData = this.parseChatResponse(response.data);
      } else {
        console.log("📦 Non-stream response, mengembalikan data mentah.");
        finalData = response.data;
      }
      return {
        success: true,
        data: finalData,
        prompt: prompt,
        botId: botId,
        isStream: isStream
      };
    } catch (error) {
      console.error("❌ Chat gagal:", error.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    host,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new SayHiApi({
    hostIndex: host
  });
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            error: "Paramenter 'keyword' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'prompt'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'chat'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}