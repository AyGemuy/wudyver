import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class CleverAI {
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
    const brands = ["realme", "Xiaomi", "Samsung", "Oppo", "vivo"];
    const models = {
      realme: ["RMX3890", "RMX3710", "RMX3511"],
      Xiaomi: ["2201116SG", "2201117TG", "M2101K6G"],
      Samsung: ["SM-G991B", "SM-A525F", "SM-S908B"],
      Oppo: ["CPH2211", "CPH2359"],
      vivo: ["V2105", "V2111"]
    };
    const timezones = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"];
    const languages = [{
      code: "id",
      tag: "id-ID",
      region: "ID"
    }, {
      code: "en",
      tag: "en-US",
      region: "US"
    }];
    const selectedBrand = brands[ri(0, brands.length - 1)];
    const selectedModel = models[selectedBrand][ri(0, models[selectedBrand].length - 1)];
    const selectedLang = languages[ri(0, languages.length - 1)];
    const buildId = rb(4) + "." + ri(24e4, 25e4) + ".002";
    const xDev = {
      brand: selectedBrand,
      designName: rb(4),
      deviceName: `Device-${rb(2)}`,
      deviceType: 1,
      deviceYearClass: ri(2020, 2024),
      deviceManufacturer: selectedBrand,
      modelId: null,
      modelName: selectedModel,
      osName: "Android",
      osVersion: `${ri(11, 15)}`,
      platformApiLevel: ri(30, 35),
      osBuildFingerprint: `${selectedBrand}/${selectedModel}/${rb(4)}:${ri(11, 15)}/${buildId}/user/release-keys`,
      osInternalBuildId: buildId,
      isRootOrJailBroken: "no",
      uptime: `${ri(1e6, 999999999)}`,
      ip: `${ri(1, 255)}.${ri(0, 255)}.${ri(0, 255)}.${ri(1, 255)}`,
      timeZone: timezones[ri(0, timezones.length - 1)],
      deviceCurrencyCode: "IDR",
      deviceCurrencySymbol: "Rp",
      deviceLanguageCode: selectedLang.code,
      deviceLanguageTag: selectedLang.tag,
      deviceRegionCode: selectedLang.region,
      deviceTextDirection: "ltr"
    };
    return {
      "User-Agent": `okhttp/${ri(3, 4)}.${ri(10, 12)}.${ri(0, 5)}`,
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip",
      "accept-language": selectedLang.code,
      version: `9.${ri(20, 25)}.${ri(1, 20)}`,
      "x-version": `9.${ri(20, 25)}.${ri(1, 20)}`,
      "x-build-number": `${ri(3e3, 4e3)}`,
      "x-app-id": rb(16).toLowerCase(),
      "x-experience-type": ri(0, 1) === 1 ? "COIN_B" : "COIN_A",
      "x-functions-key": this.funcKey || rb(10),
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
      const res = await axios.post(`${this.baseUrl}/users`, regForm, {
        headers: {
          ...this.headers,
          ...regForm.getHeaders(),
          authorization: `Bearer ${this.token}`,
          "x-uid": this.uid
        }
      });
      this.log("User berhasil didaftarkan di backend.", "SUCCESS");
      console.log(res.data);
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
      console.log(res.data);
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
      console.log(res.data);
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
        console.log(res.data);
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
    engine,
    module
  }) {
    await this.init();
    let selectedEngine = engine || this.engines.chat;
    let moduleType = module || "CHAT";
    this.log(`Mode: ${moduleType} | Engine: ${selectedEngine}`, "INFO");
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
              console.log(jsonStr);
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
  const api = new CleverAI();
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