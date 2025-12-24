import axios from "axios";
import https from "https";
import crypto from "crypto";
class ChatGPTClient {
  constructor(options = {}) {
    this.baseURL = "https://chatgpt.com";
    this.deviceId = options.deviceId || crypto.randomUUID();
    this.language = options.language || "en-US";
    this.timezone = options.timezone || "Europe/Berlin";
    this.timezoneOffset = options.timezoneOffset || -120;
    this.tokenCSRF = null;
    this.tokenOaiSC = null;
    this.conduitToken = null;
    this.cookies = {};
    this.isInit = false;
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";
    this.platform = '"Windows"';
    this.uaMobile = "?0";
    this.uaFull = '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"';
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 3e4,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      if (Object.keys(this.cookies).length > 0) {
        config.headers.cookie = this.getCookieStr();
      }
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      this.updateCookies(response.headers["set-cookie"]);
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
      return response;
    }, error => {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || "Network Error"}`);
      return Promise.reject(error);
    });
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
  randFloat(min, max) {
    return (Math.random() * (max - min) + min).toFixed(4);
  }
  encodeBase64(e) {
    try {
      return btoa(String.fromCharCode(...new TextEncoder().encode(e)));
    } catch {
      return btoa(unescape(encodeURIComponent(e)));
    }
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
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      "cache-control": "no-cache",
      referer: `${this.baseURL}/`,
      "referrer-policy": "strict-origin-when-cross-origin",
      "oai-device-id": uuid,
      "user-agent": this.userAgent,
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": this.uaFull,
      "sec-ch-ua-mobile": this.uaMobile,
      "sec-ch-ua-platform": this.platform,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      origin: this.baseURL
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
  async ensureInit() {
    if (!this.isInit) {
      console.log("🔄 Performing automatic initialization...");
      await this.init();
    }
  }
  async ensureSession() {
    if (!this.tokenCSRF || !this.deviceId) {
      console.warn("⚠️ Session data expired or missing, refreshing session...");
      await this.rotateSession();
    }
  }
  async init() {
    try {
      this.deviceId = crypto.randomUUID();
      await this.fetchCookies();
      await this.rotateSession();
      this.isInit = true;
      console.log("✅ Bot successfully initialized.");
    } catch (err) {
      console.error("❌ Failed during initialization:", err);
      this.isInit = false;
      throw err;
    }
  }
  async fetchCookies() {
    try {
      const headers = {
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
      };
      const response = await this.axiosInstance.get("/", {
        headers: headers
      });
      console.log("🍪 Initial cookies successfully fetched.");
    } catch (err) {
      console.error("❌ Failed to fetch initial cookies:", err);
      throw err;
    }
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
      console.error("❌ Failed to refresh session:", err);
      throw err;
    }
  }
  async getCSRF(uuid) {
    if (this.tokenCSRF) {
      console.log("🔄 Using stored CSRF token.");
      return this.tokenCSRF;
    }
    const headers = await this.buildHeaders({
      accept: "application/json",
      spoof: true,
      preUuid: uuid
    });
    try {
      const response = await this.axiosInstance.get("/api/auth/csrf", {
        headers: headers
      });
      const data = response.data;
      if (!data?.csrfToken) {
        console.error("❌ Failed to get CSRF token:", data);
        throw new Error("Failed to get CSRF token.");
      }
      this.tokenCSRF = data.csrfToken;
      console.log("✅ CSRF token successfully obtained.");
      return this.tokenCSRF;
    } catch (err) {
      console.error("❌ Error getting CSRF token:", err);
      throw new Error("Failed to get CSRF token.");
    }
  }
  async getSentinel(uuid, csrf) {
    const headers = await this.buildHeaders({
      accept: "application/json",
      spoof: true,
      preUuid: uuid
    });
    const fakeToken = await this.makeFakeToken();
    const cookieStr = `${this.getCookieStr()}; __Host-next-auth.csrf-token=${csrf}; oai-did=${uuid}; oai-nav-state=1;`;
    try {
      const response = await this.axiosInstance.post("/backend-anon/sentinel/chat-requirements", {
        p: fakeToken
      }, {
        headers: {
          ...headers,
          cookie: cookieStr
        }
      });
      const data = response.data;
      if (!data?.token || !data?.proofofwork) {
        console.error("❌ Failed to get sentinel token:", data);
        throw new Error("Failed to get sentinel token.");
      }
      let oaiSc = null;
      const cookieHeader = response.headers["set-cookie"];
      if (cookieHeader) {
        const oaiScCookie = cookieHeader.find(c => c.startsWith("oai-sc="));
        if (oaiScCookie) {
          oaiSc = oaiScCookie.split("oai-sc=")[1]?.split(";")[0] || null;
        } else {
          console.warn("⚠️ oai-sc token not found in cookie header.");
        }
      }
      const challenge = await this.solveCaptcha(data.proofofwork.seed, data.proofofwork.difficulty);
      console.log("✅ Sentinel token successfully obtained.");
      if (oaiSc) console.log("✅ oai-sc token successfully obtained.");
      return {
        token: data.token,
        proof: challenge,
        oaiSc: oaiSc
      };
    } catch (err) {
      console.error("❌ Error getting sentinel token:", err);
      throw new Error("Failed to get sentinel token.");
    }
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
  async chat(options = {}) {
    const {
      prompt = "Hello, how are you?",
        messages = [],
        model = "auto",
        timezone_offset_min = -120,
        history_and_training_disabled = false,
        conversation_mode = {
          kind: "primary_assistant",
          plugin_ids: null
        },
        force_paragen = false,
        force_paragen_model_slug = "",
        force_nulligen = false,
        force_rate_limit = false,
        reset_rate_limits = false,
        force_use_sse = true, ...rest
    } = options;
    if (!prompt && messages.length === 0) {
      throw new Error("Prompt or messages are required");
    }
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
        accept: "text/plain",
        spoof: true,
        preUuid: this.deviceId
      });
      const sentinel = await this.getSentinel(this.deviceId, this.tokenCSRF);
      const cookieStr = `${this.getCookieStr()}; __Host-next-auth.csrf-token=${this.tokenCSRF}; oai-did=${this.deviceId}; oai-nav-state=1; ${sentinel?.oaiSc ? `oai-sc=${sentinel.oaiSc};` : ""}`;
      const requestData = {
        action: "next",
        messages: currentMessages,
        parent_message_id: parentId,
        model: model,
        timezone_offset_min: timezone_offset_min,
        suggestions: [],
        history_and_training_disabled: history_and_training_disabled,
        conversation_mode: conversation_mode,
        force_paragen: force_paragen,
        force_paragen_model_slug: force_paragen_model_slug,
        force_nulligen: force_nulligen,
        force_rate_limit: force_rate_limit,
        reset_rate_limits: reset_rate_limits,
        websocket_request_id: this.randUuid(),
        force_use_sse: force_use_sse,
        ...rest
      };
      const response = await this.axiosInstance.post("/backend-anon/conversation", requestData, {
        headers: {
          ...headers,
          cookie: cookieStr,
          "openai-sentinel-chat-requirements-token": sentinel?.token,
          "openai-sentinel-proof-token": sentinel?.proof
        }
      });
      if (response.status !== 200) {
        console.error("❌ HTTP Error:", response.status, response.statusText);
        throw new Error(`HTTP Error! status: ${response.status}`);
      }
      const text = response.data;
      const parsed = this.parseResponse(text);
      console.log("✅ Response received.");
      return {
        result: parsed,
        rawResponse: text,
        success: true
      };
    } catch (error) {
      console.error("❌ Chat error:", error);
      throw error;
    }
  }
  setHeaders(headers) {
    Object.assign(this.axiosInstance.defaults.headers, headers);
  }
  getSessionInfo() {
    return {
      deviceId: this.deviceId,
      tokenCSRF: this.tokenCSRF,
      tokenOaiSC: this.tokenOaiSC,
      cookies: this.cookies,
      isInit: this.isInit
    };
  }
  async refreshSession() {
    console.log("🔄 Manually refreshing session...");
    await this.rotateSession();
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const client = new ChatGPTClient({
    language: "en-US",
    timezone: "Europe/Berlin"
  });
  try {
    const result = await client.chat(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: "Error generating content",
      error: error.message
    });
  }
}