import axios from "axios";
import https from "https";
import crypto from "crypto";
class ChatBot {
  constructor() {
    this.tokenCSRF = undefined;
    this.tokenOaiSC = undefined;
    this.deviceId = undefined;
    this.cookies = {};
    this.isInit = false;
    this.baseUrl = "https://chatgpt.com";
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
    this.platform = "Windows";
    this.uaMobile = "?0";
    this.uaFull = '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"';
  }
  async ensureInit() {
    if (!this.isInit) {
      console.log("Melakukan inisialisasi otomatis...");
      await this.init();
    }
  }
  async ensureSession() {
    if (!this.tokenCSRF || !this.deviceId) {
      console.warn("Data sesi kedaluwarsa atau belum ada, memperbarui sesi...");
      await this.rotateSession();
    }
  }
  async init() {
    try {
      this.deviceId = crypto.randomUUID();
      await this.fetchCookies();
      await this.rotateSession();
      this.isInit = true;
      console.log("Bot berhasil diinisialisasi.");
    } catch (err) {
      console.error("Gagal dalam proses inisialisasi:", err);
      this.isInit = false;
      throw err;
    }
  }
  async fetchCookies() {
    try {
      const res = await axios.get(this.baseUrl, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        headers: {
          "user-agent": this.userAgent,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9",
          "sec-ch-ua": this.uaFull,
          "sec-ch-ua-mobile": this.uaMobile,
          "sec-ch-ua-platform": this.platform,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      this.updateCookies(res.headers["set-cookie"]);
      console.log("Cookie awal berhasil diambil.");
    } catch (err) {
      console.error("Gagal ambil cookie awal:", err);
      throw err;
    }
  }
  updateCookies(cookieArr) {
    if (cookieArr) {
      cookieArr.forEach(cookie => {
        const parts = cookie.split(";");
        const keyVal = parts[0].split("=");
        if (keyVal.length === 2) {
          this.cookies[keyVal[0].trim()] = keyVal[1].trim();
        }
      });
    }
  }
  getCookieStr() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async randIp() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 256)).join(".");
  }
  randUuid() {
    return crypto.randomUUID().toString();
  }
  async buildHeaders({
    accept,
    spoof = true,
    preUuid
  }) {
    const ip = await this.randIp();
    const uuid = preUuid || this.randUuid();
    const headers = {
      accept: accept,
      "content-type": "application/json",
      "cache-control": "no-cache",
      referer: `${this.baseUrl}/`,
      "referrer-policy": "strict-origin-when-cross-origin",
      "oai-device-id": uuid,
      "user-agent": this.userAgent,
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": this.uaFull,
      "sec-ch-ua-mobile": this.uaMobile,
      "sec-ch-ua-platform": this.platform,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors"
    };
    if (spoof) {
      headers["x-forwarded-for"] = ip;
      headers["x-originating-ip"] = ip;
      headers["x-remote-ip"] = ip;
      headers["x-remote-addr"] = ip;
      headers["x-host"] = ip;
      headers["x-forwarded-host"] = ip;
    }
    return headers;
  }
  async solveCaptcha(seed, difficulty) {
    const cores = [8, 12, 16, 24];
    const screens = [3e3, 4e3, 6e3];
    const core = cores[crypto.randomInt(0, cores.length)];
    const screen = screens[crypto.randomInt(0, screens.length)];
    const now = new Date(Date.now() - 8 * 3600 * 1e3);
    const timeStr = now.toUTCString().replace("GMT", "GMT+0100 (Central European Time)");
    const config = [core + screen, timeStr, 4294705152, 0, this.userAgent];
    const diffLen = difficulty.length / 2;
    for (let i = 0; i < 1e5; i++) {
      config[3] = i;
      const jsonData = JSON.stringify(config);
      const base64 = Buffer.from(jsonData).toString("base64");
      const hash = crypto.createHash("sha3-512").update(seed + base64).digest();
      if (hash.toString("hex").substring(0, diffLen) <= difficulty) {
        return "gAAAAAB" + base64;
      }
    }
    const fallback = Buffer.from(`${seed}`).toString("base64");
    return "gAAAAABwQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D" + fallback;
  }
  async makeFakeToken() {
    const prefix = "gAAAAAC";
    const config = [crypto.randomInt(3e3, 6e3), new Date().toUTCString().replace("GMT", "GMT+0100 (Central European Time)"), 4294705152, 0, this.userAgent, "de", "de", 401, "mediaSession", "location", "scrollX", this.randFloat(1e3, 5e3), crypto.randomUUID(), "", 12, Date.now()];
    const base64 = Buffer.from(JSON.stringify(config)).toString("base64");
    return prefix + base64;
  }
  randFloat(min, max) {
    return (Math.random() * (max - min) + min).toFixed(4);
  }
  parseResponse(input) {
    return input.split("\n").map(part => part.trim()).filter(part => part).map(part => {
      try {
        const json = JSON.parse(part.slice(6));
        return json.message && json.message.status === "finished_successfully" && json.message.metadata.is_complete ? json : null;
      } catch (error) {
        return null;
      }
    }).filter(Boolean).pop()?.message.content.parts.join("") || input;
  }
  async rotateSession() {
    try {
      const uuid = this.randUuid();
      const csrf = await this.getCSRF(uuid);
      const sentinel = await this.getSentinel(uuid, csrf);
      this.tokenCSRF = csrf;
      this.tokenOaiSC = sentinel?.oaiSc;
      this.deviceId = uuid;
      return {
        uuid: uuid,
        csrf: csrf,
        sentinel: sentinel
      };
    } catch (err) {
      console.error("Gagal memperbarui sesi:", err);
      throw err;
    }
  }
  async getCSRF(uuid) {
    if (this.tokenCSRF) {
      console.log("Menggunakan token CSRF tersimpan.");
      return this.tokenCSRF;
    }
    const headers = await this.buildHeaders({
      accept: "application/json",
      spoof: true,
      preUuid: uuid
    });
    try {
      const res = await axios.get(`${this.baseUrl}/api/auth/csrf`, {
        headers: {
          ...headers,
          cookie: this.getCookieStr()
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });
      this.updateCookies(res.headers["set-cookie"]);
      const data = res.data;
      if (!data?.csrfToken) {
        console.error("Gagal ambil token CSRF:", data);
        throw new Error("Gagal ambil token CSRF.");
      }
      this.tokenCSRF = data.csrfToken;
      console.log("Token CSRF berhasil diambil.");
      return this.tokenCSRF;
    } catch (err) {
      console.error("Kesalahan ambil token CSRF:", err);
      throw new Error("Gagal ambil token CSRF.");
    }
  }
  async getSentinel(uuid, csrf) {
    const headers = await this.buildHeaders({
      accept: "application/json",
      spoof: true,
      preUuid: uuid
    });
    const fakeToken = await this.makeFakeToken();
    try {
      const res = await axios.post(`${this.baseUrl}/backend-anon/sentinel/chat-requirements`, {
        p: fakeToken
      }, {
        headers: {
          ...headers,
          cookie: `${this.getCookieStr()}; __Host-next-auth.csrf-token=${csrf}; oai-did=${uuid}; oai-nav-state=1;`
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });
      this.updateCookies(res.headers["set-cookie"]);
      const data = res.data;
      if (!data?.token || !data?.proofofwork) {
        console.error("Gagal ambil token sentinel:", data);
        throw new Error("Gagal ambil token sentinel.");
      }
      let oaiSc = null;
      const cookieHeader = res.headers["set-cookie"];
      if (cookieHeader) {
        const oaiScCookie = cookieHeader.find(c => c.startsWith("oai-sc="));
        if (oaiScCookie) {
          oaiSc = oaiScCookie.split("oai-sc=")[1]?.split(";")[0] || null;
        } else {
          console.warn("Token oai-sc tidak ditemukan di header cookie.");
        }
      } else {
        console.warn("Header cookie tidak terdefinisi untuk permintaan token sentinel.");
      }
      const challenge = await this.solveCaptcha(data.proofofwork.seed, data.proofofwork.difficulty);
      console.log("Token sentinel berhasil diambil.");
      if (oaiSc) console.log("Token oai-sc berhasil diambil.");
      return {
        token: data.token,
        proof: challenge,
        oaiSc: oaiSc
      };
    } catch (err) {
      console.error("Kesalahan ambil token sentinel:", err);
      throw new Error("Gagal ambil token sentinel.");
    }
  }
  async chat({
    prompt,
    messages = [],
    model = "auto"
  }) {
    try {
      await this.ensureInit();
      await this.ensureSession();
      const currentMessages = messages.length ? messages : [{
        id: this.randUuid(),
        author: {
          role: "user"
        },
        content: {
          content_type: "text",
          parts: [prompt]
        },
        metadata: {}
      }];
      const parentId = messages.length ? messages[messages.length - 1].id : this.randUuid();
      const headers = await this.buildHeaders({
        accept: "plain/text",
        spoof: true,
        preUuid: this.deviceId
      });
      const sentinel = await this.getSentinel(this.deviceId, this.tokenCSRF);
      const res = await axios.post(`${this.baseUrl}/backend-anon/conversation`, {
        action: "next",
        messages: currentMessages,
        parent_message_id: parentId,
        model: model,
        timezone_offset_min: -120,
        suggestions: [],
        history_and_training_disabled: false,
        conversation_mode: {
          kind: "primary_assistant",
          plugin_ids: null
        },
        force_paragen: false,
        force_paragen_model_slug: "",
        force_nulligen: false,
        force_rate_limit: false,
        reset_rate_limits: false,
        websocket_request_id: this.randUuid(),
        force_use_sse: true
      }, {
        headers: {
          ...headers,
          cookie: `${this.getCookieStr()}; __Host-next-auth.csrf-token=${this.tokenCSRF}; oai-did=${this.deviceId}; oai-nav-state=1; ${sentinel?.oaiSc ? `oai-sc=${sentinel.oaiSc};` : ""}`,
          "openai-sentinel-chat-requirements-token": sentinel?.token,
          "openai-sentinel-proof-token": sentinel?.proof
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });
      this.updateCookies(res.headers["set-cookie"]);
      if (res.status !== 200) {
        console.error("Kesalahan HTTP:", res.status, res.statusText);
        throw new Error(`Kesalahan HTTP! status: ${res.status}`);
      }
      const text = res.data;
      const parsed = this.parseResponse(text);
      console.log("Respons diterima.");
      return {
        result: parsed
      };
    } catch (err) {
      console.error("Kesalahan chat:", err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const bot = new ChatBot();
  try {
    const result = await bot.chat(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: "Error generating content",
      error: error.message
    });
  }
}