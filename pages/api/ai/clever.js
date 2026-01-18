import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class GeniusAI {
  constructor() {
    this.baseUrl = "https://public.trafficmanager.net/appserver/api/v1";
    this.token = null;
    this.uid = null;
    this.funcKey = "ctJClL5ezIYhRIty-jVhZjjnmBBxhTsSQWggso9VwXC4AzFug0JSEA==";
    this.headers = this.genHead();
    this.engines = {
      chat: "google-gemini-2-5-flash",
      image: "google-gemini-2-5-flash-image",
      video: "runway-text2vid-gen3a-turbo",
      audio: "openai-tts-1"
    };
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    const icons = {
      INFO: "ℹ️",
      WARN: "⚠️",
      ERROR: "❌",
      SUCCESS: "✅",
      STREAM: "🌊"
    };
    console.log(`[${time}] ${icons[type] || ""} [${type}] ${msg}`);
  }
  genHead() {
    const ri = (a, b) => crypto.randomInt(a, b + 1);
    const rb = n => crypto.randomBytes(n).toString("hex").toUpperCase();
    const xDev = {
      brand: "realme",
      designName: "RE5C91L1",
      deviceName: "Malik.Js",
      deviceType: 1,
      deviceYearClass: 2024,
      deviceManufacturer: "realme",
      modelId: null,
      modelName: "RMX3890",
      osName: "Android",
      osVersion: "15",
      platformApiLevel: 35,
      osBuildFingerprint: "realme/RMX3890INT/RE5C91L1:15/AQ3A.240812.002/user/release-keys",
      osInternalBuildId: "AQ3A.240812.002",
      isRootOrJailBroken: "no",
      uptime: `${ri(1e8, 999999999)}`,
      ip: "0.0.0.0",
      timeZone: "Asia/Makassar",
      deviceCurrencyCode: "IDR",
      deviceCurrencySymbol: "Rp",
      deviceLanguageCode: "id",
      deviceLanguageTag: "id-ID",
      deviceRegionCode: "ID",
      deviceTextDirection: "ltr"
    };
    return {
      "User-Agent": "okhttp/4.12.0",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip",
      "accept-language": "en",
      version: "9.22.14",
      "x-version": "9.22.14",
      "x-build-number": "3076",
      "x-app-id": rb(16),
      "x-experience-type": "COIN_B",
      "x-functions-key": this.funcKey,
      "x-platform": "android",
      "x-device": JSON.stringify(xDev)
    };
  }
  async init() {
    if (this.token) return;
    this.log("Memulai proses otentikasi...", "INFO");
    try {
      const authPayload = {
        clientType: "CLIENT_TYPE_ANDROID"
      };
      const authRes = await axios.post("https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyCbQaKAe3s-qff7KcjK030BnES098azacE", authPayload, {
        headers: {
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890)",
          "Content-Type": "application/json",
          "X-Android-Package": "com.turbofasttools.geniusai",
          "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81"
        }
      });
      this.token = authRes.data.idToken;
      this.uid = authRes.data.localId;
      this.log(`Token didapat. UID: ${this.uid}`, "SUCCESS");
      const regForm = new FormData();
      regForm.append("json", JSON.stringify({
        uid: this.uid,
        appId: this.headers["x-app-id"],
        platform: "android",
        isAnonymousUser: true
      }));
      await axios.post(`${this.baseUrl}/users`, regForm, {
        headers: {
          ...this.headers,
          ...regForm.getHeaders(),
          authorization: `Bearer ${this.token}`,
          "x-uid": this.uid
        }
      });
      this.log("User berhasil didaftarkan di backend.", "SUCCESS");
    } catch (e) {
      this.log(`Gagal Init: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async upload(mediaData) {
    this.log("Memulai upload media...", "INFO");
    let buffer;
    if (Buffer.isBuffer(mediaData)) {
      buffer = mediaData;
    } else if (typeof mediaData === "string" && mediaData.startsWith("http")) {
      const resp = await axios.get(mediaData, {
        responseType: "arraybuffer"
      });
      buffer = Buffer.from(resp.data);
    } else {
      throw new Error("Format media tidak didukung (harus Buffer atau URL)");
    }
    const form = new FormData();
    const fname = `${crypto.randomUUID()}.jpeg`;
    form.append("file", buffer, {
      filename: fname,
      contentType: "image/jpeg"
    });
    form.append("json", JSON.stringify({
      fileName: fname
    }));
    try {
      const res = await axios.post(`${this.baseUrl}/files`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          authorization: `Bearer ${this.token}`,
          "x-uid": this.uid
        }
      });
      this.log(`Upload berhasil: ${res.data.url}`, "SUCCESS");
      return res.data.url;
    } catch (e) {
      this.log(`Upload gagal: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async search({
    type = "engines"
  }) {
    await this.init();
    this.log(`Mencari konfigurasi: ${type}`, "INFO");
    const endpoint = type === "bots" ? "/bots" : "/configs?type=engines";
    try {
      const res = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "x-uid": this.uid
        },
        params: type === "bots" ? {
          limit: 50,
          offset: 0
        } : {}
      });
      this.log(`Ditemukan ${type === "bots" ? res.data.bots?.length : res.data.length} item.`, "SUCCESS");
      return res.data;
    } catch (e) {
      this.log(`Search error: ${e.message}`, "ERROR");
      return [];
    }
  }
  async poll(id) {
    this.log(`Memulai polling untuk ID: ${id}`, "INFO");
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await axios.get(`${this.baseUrl}/files/${id}`, {
          headers: {
            ...this.headers,
            authorization: `Bearer ${this.token}`,
            "x-uid": this.uid
          }
        });
        const item = res.data.results?.[0];
        if (item) {
          if (item.status === "COMPLETED") {
            this.log(`Polling selesai. URL: ${item.url}`, "SUCCESS");
            return item;
          } else if (item.status === "FAILED") {
            throw new Error("Proses remote gagal.");
          }
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        this.log(`Polling error: ${e.message}`, "WARN");
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    prompt,
    image,
    mode = "chat",
    engine,
    module
  }) {
    await this.init();
    let selectedEngine = engine || this.engines[mode] || this.engines.chat;
    let moduleType = module || "CHAT";
    this.log(`Mode: ${mode} | Engine: ${selectedEngine}`, "INFO");
    const contentArr = [];
    contentArr.push({
      type: "text",
      text: prompt
    });
    if (image) {
      const imgUrl = await this.upload(image);
      contentArr.push({
        type: "image_url",
        image_url: {
          url: imgUrl
        }
      });
    }
    const payload = {
      messages: [{
        role: "user",
        content: contentArr
      }],
      thread: {
        id: null
      },
      appId: this.headers["x-app-id"],
      platform: "android",
      engine: selectedEngine,
      module: moduleType,
      options: {
        type: 2,
        tools: [],
        language: "en",
        regenerate: false
      },
      wallet: {
        totalCredit: 30,
        config: {
          chatScreenRateDisplayCount: 50
        }
      },
      device: JSON.parse(this.headers["x-device"])
    };
    this.log("Mengirim request generation...", "INFO");
    try {
      const res = await axios.post(`${this.baseUrl}/omni/response?stream=true&type=2`, payload, {
        headers: {
          ...this.headers,
          Accept: "text/event-stream",
          authorization: `Bearer ${this.token}`,
          "x-uid": this.uid
        },
        responseType: "stream"
      });
      const accumulatedData = {
        text: "",
        mediaIds: []
      };
      res.data.on("data", chunk => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("data:")) {
            try {
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr === "[DONE]") return;
              const data = JSON.parse(jsonStr);
              if (data.delta) {
                const content = data.delta.content;
                if (typeof content === "string") {
                  accumulatedData.text += content;
                  process.stdout.write(content);
                } else if (Array.isArray(content)) {
                  for (const item of content) {
                    if (item.type === "text" && item.text) {
                      accumulatedData.text += item.text;
                      process.stdout.write(item.text);
                    } else if (item.type && item[item.type] && item[item.type].id) {
                      const id = item[item.type].id;
                      this.log(`\nDiterima Media ID (${item.type}): ${id}`, "STREAM");
                      accumulatedData.mediaIds.push({
                        type: item.type,
                        id: id
                      });
                    } else if (item.image_url?.url || item.video_url?.url) {
                      this.log("\nDiterima Direct URL", "STREAM");
                    }
                  }
                }
              }
            } catch (err) {}
          }
        }
      });
      return new Promise((resolve, reject) => {
        res.data.on("end", async () => {
          console.log("");
          this.log("Stream selesai.", "SUCCESS");
          const finalResult = {
            text: accumulatedData.text,
            files: []
          };
          if (accumulatedData.mediaIds.length > 0) {
            for (const media of accumulatedData.mediaIds) {
              try {
                const pollResult = await this.poll(media.id);
                finalResult.files.push(pollResult);
              } catch (e) {
                this.log(`Gagal retrieve media ${media.id}`, "ERROR");
              }
            }
          }
          resolve(finalResult);
        });
        res.data.on("error", e => reject(e));
      });
    } catch (e) {
      this.log(`Generation Error: ${e.message}`, "ERROR");
      if (e.response) this.log(JSON.stringify(e.response.data), "ERROR");
      throw e;
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
      actions: ["generate", "search"]
    });
  }
  const api = new GeniusAI();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "Hello!"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "search":
        result = await api.search(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "search"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}