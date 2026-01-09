import axios from "axios";
import https from "https";
import crypto from "crypto-js";
import apiConfig from "@/configs/apiConfig";
class ArtAny {
  constructor() {
    this.agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
    this.cookieStore = new Map();
    this.token = null;
    this.currentUser = null;
    this.sessionData = null;
    this.cfg = {
      baseUrl: "https://www.artany.ai/api",
      supabaseUrl: "https://urrxpnraqkaiickvdtfl.supabase.co",
      supabaseProject: "urrxpnraqkaiickvdtfl",
      mailApi: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycnhwbnJhcWthaWlja3ZkdGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMzNjMsImV4cCI6MjA3NDYxOTM2M30.JFp8mnLQRuHAh7oYTGXFGP9K9hShl_MxMFZAesNjtcE",
      models: {
        "volc-omnihuman": {
          id: "volc-omnihuman",
          url: "/volc",
          status_url: "/video-task-status",
          type: "video",
          req_params: ["first_frame_image", "audio_url"]
        },
        "lipsync-pro": {
          id: "sync-lipsync-v2-pro",
          url: "/fal/lipsync",
          status_url: "/video-task-status",
          type: "video",
          req_params: ["video_url", "audio_url"]
        },
        turbo: {
          id: "turbo",
          url: "/image-generator/turbo",
          type: "image",
          allow_ar: true
        },
        "nano-banana": {
          id: "gemini-2.5-flash-text-to-image",
          url: "/image-generator/gemini-2.5-flash",
          type: "image",
          allow_ar: true
        },
        "nano-banana-pro": {
          id: "nano-banana-pro-text-to-image",
          url: "/image-generator/nano-banana-pro",
          type: "image",
          allow_ar: true,
          allow_quality: true
        },
        seedream4: {
          id: "text-image-doubao-seedream-4-0-250828",
          url: "/image-generator/seedream4",
          type: "image",
          allow_ar: true
        },
        seedream3: {
          id: "seedream3-text-to-image",
          url: "/seedream3",
          type: "image",
          allow_ar: true
        },
        "seedream3.1": {
          id: "seedream3-1-text-to-image",
          url: "/fal/seedream3.1",
          type: "image",
          allow_ar: true
        },
        fluxdev: {
          id: "fluxdev",
          url: "/image-generator/fluxdev",
          type: "image",
          allow_ar: true
        },
        flux2: {
          id: "flux2-text-to-image",
          url: "/image-generator/flux2",
          type: "image",
          allow_ar: true,
          allow_seed: true
        },
        "flux2-pro": {
          id: "flux2-pro-text-to-image",
          url: "/image-generator/flux2",
          type: "image",
          allow_ar: true,
          allow_seed: true
        },
        "flux2-flex": {
          id: "flux2-flex-text-to-image",
          url: "/image-generator/flux2",
          type: "image",
          allow_ar: true
        },
        "wan2.5": {
          id: "wan2.5-text-to-image",
          url: "/image-generator/wan2.5",
          type: "image",
          allow_ar: true,
          allow_seed: true
        },
        "wan2.2": {
          id: "wan2.2-text-to-image",
          url: "/fal/wan2.2-image",
          type: "image",
          allow_ar: true
        },
        "wan2.2-5b": {
          id: "wan2.2-text-to-image-5b",
          url: "/fal/wan2.2-image",
          type: "image",
          allow_ar: true
        },
        hunyuan: {
          id: "hunyuan-image-v3",
          url: "/image-generator/hunyuan",
          type: "image",
          allow_ar: true
        },
        "kling-o1": {
          id: "kling-image-o1-text-to-image",
          url: "/image-generator/kling-image-o1",
          type: "image",
          allow_ar: true,
          allow_quality: true
        },
        "z-image": {
          id: "z-image-turbo",
          url: "/image-generator/z-image",
          type: "image",
          allow_ar: true
        },
        midjourney: {
          id: "midjourney-ai-text-to-image",
          url: "/image-generator/midjourney-ai",
          type: "image",
          allow_ar: true,
          allow_quality: true
        },
        luma: {
          id: "luma-photon-text2image",
          url: "/fal/luma-photon",
          type: "image",
          allow_ar: true
        },
        "luma-flash": {
          id: "luma-photon-text2image-flash",
          url: "/fal/luma-photon",
          type: "image",
          allow_ar: true
        },
        krea: {
          id: "krea-text-to-image",
          url: "/fal/krea",
          type: "image",
          allow_ar: true
        },
        qwen: {
          id: "qwen-text-to-image",
          url: "/fal/qwen-image",
          type: "image",
          allow_ar: true
        },
        ovis: {
          id: "ovis-text-to-image",
          url: "/image-generator/ovis-image",
          type: "image",
          allow_ar: true
        },
        imagen4: {
          id: "imagen4-text-to-image",
          url: "/fal/imagen4",
          type: "image",
          allow_ar: true
        },
        "imagen4-fast": {
          id: "imagen4-text-to-image-fast",
          url: "/fal/imagen4",
          type: "image",
          allow_ar: true
        },
        "imagen4-ultra": {
          id: "imagen4-text-to-image-ultra",
          url: "/fal/imagen4",
          type: "image",
          allow_ar: true
        },
        "kontext-pro": {
          id: "kontext-pro-t2i",
          url: "/fal/flux1-kontext",
          type: "image",
          allow_ar: true
        },
        "kontext-max": {
          id: "kontext-max-t2i",
          url: "/fal/flux1-kontext",
          type: "image",
          allow_ar: true
        },
        "flux-sketch": {
          id: "flux-kontext-lora-text-to-image",
          url: "/fal/flux-kontext-lora",
          type: "image",
          allow_ar: true
        },
        "edit-nano-banana": {
          id: "gemini-2.5-flash-image-editor",
          url: "/image-generator/gemini-2.5-flash",
          type: "image",
          allow_image: true,
          allow_ar: true
        },
        "edit-nano-banana-pro": {
          id: "nano-banana-pro-image-editor",
          url: "/image-generator/nano-banana-pro",
          type: "image",
          allow_image: true,
          allow_ar: true,
          allow_quality: true
        },
        "edit-seedream4": {
          id: "image-editor-doubao-seedream-4-0-250828",
          url: "/image-generator/seedream4",
          type: "image",
          allow_image: true,
          allow_ar: true
        },
        "edit-wan2.5": {
          id: "wan2.5-image-to-image",
          url: "/image-generator/wan2.5",
          type: "image",
          allow_image: true,
          allow_ar: true
        },
        "edit-flux2": {
          id: "flux2-image-to-image",
          url: "/image-generator/flux2",
          type: "image",
          allow_image: true,
          allow_ar: true
        },
        "edit-kling-o1": {
          id: "kling-image-o1-image-to-image",
          url: "/image-generator/kling-image-o1",
          type: "image",
          allow_image: true,
          allow_ar: true
        },
        "edit-qwen": {
          id: "qwen-image-edit",
          url: "/fal/qwen-image",
          type: "image",
          allow_image: true,
          allow_ar: true
        },
        "edit-luma-modify": {
          id: "luma-photon-modify",
          url: "/fal/luma-photon",
          type: "image",
          allow_image: true,
          allow_strength: true,
          allow_ar: true
        },
        "edit-luma-reframe": {
          id: "luma-photon-reframe",
          url: "/fal/luma-photon",
          type: "image",
          allow_image: true,
          allow_ar: true
        }
      },
      defaultModel: "nano-banana-pro",
      defaultRatio: "3:4",
      defaultQuality: "1k",
      statusEndpointDefault: "/image-task-status"
    };
    const commonHeaders = {
      apikey: this.cfg.anonKey,
      "Content-Type": "application/json"
    };
    this.api = axios.create({
      baseURL: this.cfg.baseUrl,
      httpsAgent: this.agent,
      timeout: 6e4,
      headers: commonHeaders
    });
    this.supabase = axios.create({
      baseURL: this.cfg.supabaseUrl,
      httpsAgent: this.agent,
      timeout: 6e4,
      headers: commonHeaders
    });
    this.mailClient = axios.create({
      baseURL: this.cfg.mailApi,
      httpsAgent: this.agent,
      timeout: 6e4
    });
    this.setupInterceptors();
  }
  setupInterceptors() {
    const attachAuth = config => {
      config.headers = config.headers || {};
      config.headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const cookies = this.getCookieString();
      if (cookies) config.headers["cookie"] = cookies;
      if (this.token) {
        config.headers["authorization"] = `Bearer ${this.token}`;
      }
      if (!config.headers["apikey"]) {
        config.headers["apikey"] = this.cfg.anonKey;
      }
      return config;
    };
    const handleResponse = response => {
      this.saveCookies(response.headers);
      return response;
    };
    const handleError = async error => {
      if (error.response?.headers) {
        this.saveCookies(error.response.headers);
      }
      const isLoginRequest = error.config.url.includes("/auth/v1/") || error.config.url.includes("mails");
      if (error.response && error.response.status === 401 && !isLoginRequest && !error.config._retry) {
        this.log("Token expired or invalid (401). Refreshing session...", "process");
        error.config._retry = true;
        try {
          await this.refreshSession();
          error.config.headers["authorization"] = `Bearer ${this.token}`;
          const newCookies = this.getCookieString();
          if (newCookies) error.config.headers["cookie"] = newCookies;
          return this.api(error.config);
        } catch (refreshError) {
          this.log("Session refresh failed. Re-login required.", "error");
          this.token = null;
          this.sessionData = null;
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    };
    this.api.interceptors.request.use(attachAuth);
    this.api.interceptors.response.use(handleResponse, handleError);
    this.supabase.interceptors.request.use(attachAuth);
    this.supabase.interceptors.response.use(handleResponse, err => Promise.reject(err));
  }
  log(msg, type = "info") {
    const colors = {
      info: "[36m",
      process: "[33m",
      success: "[32m",
      error: "[31m",
      reset: "[0m"
    };
    console.log(`${colors[type] || colors.info}[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${msg}${colors.reset}`);
  }
  randomString(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  saveCookies(headers) {
    const setCookie = headers["set-cookie"] || headers["Set-Cookie"];
    if (setCookie) {
      const list = Array.isArray(setCookie) ? setCookie : [setCookie];
      list.forEach(cookieStr => {
        const parts = cookieStr.split(";");
        const pair = parts[0].split("=");
        const key = pair[0]?.trim();
        const value = pair[1]?.trim() || "";
        if (key) this.cookieStore.set(key, value);
      });
    }
  }
  getCookieString() {
    return Array.from(this.cookieStore.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  exportSession() {
    if (!this.token) {
      this.log("No active session to export", "error");
      return null;
    }
    const session = {
      token: this.token,
      cookies: Object.fromEntries(this.cookieStore),
      user: this.currentUser,
      timestamp: Date.now()
    };
    const jsonStr = JSON.stringify(session);
    const base64Session = Buffer.from(jsonStr).toString("base64");
    this.log("Session exported successfully", "success");
    return base64Session;
  }
  importSession(base64Session) {
    try {
      const jsonStr = Buffer.from(base64Session, "base64").toString("utf-8");
      const session = JSON.parse(jsonStr);
      this.token = session.token;
      this.currentUser = session.user;
      this.cookieStore = new Map(Object.entries(session.cookies || {}));
      this.sessionData = session;
      const cookieName = `sb-${this.cfg.supabaseProject}-auth-token`;
      const cookieValue = encodeURIComponent(JSON.stringify([this.token, null, null, null, null]));
      this.cookieStore.set(cookieName, cookieValue);
      this.log(`Session imported successfully (User: ${this.currentUser?.email})`, "success");
      return true;
    } catch (e) {
      this.log(`Failed to import session: ${e.message}`, "error");
      return false;
    }
  }
  async refreshSession() {
    if (!this.token) {
      throw new Error("No token available for refresh");
    }
    try {
      this.log("Attempting to refresh session...", "process");
      const {
        data: user
      } = await this.supabase.get("/auth/v1/user", {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      if (user) {
        this.currentUser = user;
        this.log("Session refreshed successfully", "success");
        return true;
      }
    } catch (e) {
      this.log("Session refresh failed, re-login required", "error");
      throw e;
    }
  }
  async validateSession() {
    if (!this.token) return false;
    try {
      const {
        data
      } = await this.supabase.get("/auth/v1/user", {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      return !!data;
    } catch (e) {
      return false;
    }
  }
  generatePKCE() {
    const verifier = this.randomString(56);
    const hash = crypto.SHA256(verifier);
    const challenge = hash.toString(crypto.enc.Base64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return {
      verifier: verifier,
      challenge: challenge
    };
  }
  async getMail() {
    try {
      const {
        data
      } = await this.mailClient.get("?action=create");
      this.tempMail = data?.email;
      this.log(`Temp Mail: ${this.tempMail}`, "info");
      return this.tempMail;
    } catch (error) {
      this.log(`Failed to get temp mail: ${error.message}`, "error");
      throw error;
    }
  }
  async checkMailLink() {
    this.log("Waiting for Magic Link...", "process");
    for (let i = 0; i < 30; i++) {
      await this.sleep(3e3);
      try {
        const {
          data
        } = await this.mailClient.get(`?action=message&email=${this.tempMail}`);
        if (data?.data?.length > 0) {
          const content = data.data[0].text_content || data.data[0].html_content || "";
          const match = content.match(/(https:\/\/urrxpnraqkaiickvdtfl\.supabase\.co\/auth\/v1\/verify\?[^"\s]+)/);
          if (match) return match[1].replace(/&amp;/g, "&");
        }
      } catch (e) {}
    }
    throw new Error("Link timeout");
  }
  async login() {
    try {
      const email = await this.getMail();
      const {
        verifier,
        challenge
      } = this.generatePKCE();
      this.cookieStore.set(`sb-${this.cfg.supabaseProject}-auth-token-code-verifier`, verifier);
      this.log(`Requesting OTP for ${email}...`, "process");
      await this.supabase.post("/auth/v1/otp", {
        email: email,
        data: {},
        create_user: true,
        code_challenge: challenge,
        code_challenge_method: "s256"
      }, {
        params: {
          redirect_to: "https://www.artany.ai/api/auth/callback"
        }
      });
      const link = await this.checkMailLink();
      this.log("Verifying Link (Follow Redirect)...", "process");
      let currentUrl = link;
      let redirectCount = 0;
      const maxRedirects = 10;
      while (redirectCount < maxRedirects) {
        try {
          const res = await axios.get(currentUrl, {
            httpsAgent: this.agent,
            maxRedirects: 0,
            validateStatus: s => s >= 200 && s < 400,
            headers: {
              Cookie: this.getCookieString(),
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          this.saveCookies(res.headers);
          if (res.headers.location) {
            const loc = res.headers.location;
            currentUrl = loc.startsWith("http") ? loc : `https://www.artany.ai${loc}`;
            redirectCount++;
            await this.sleep(300);
          } else {
            break;
          }
        } catch (e) {
          break;
        }
      }
      const authCookieName = `sb-${this.cfg.supabaseProject}-auth-token`;
      const authCookieVal = this.cookieStore.get(authCookieName);
      if (!authCookieVal) throw new Error("Auth cookie not found");
      let tokenData;
      try {
        tokenData = JSON.parse(decodeURIComponent(authCookieVal));
      } catch {
        tokenData = authCookieVal;
      }
      this.token = Array.isArray(tokenData) ? tokenData[0] : tokenData.access_token || tokenData;
      if (!this.token) throw new Error("Failed to extract access token");
      const {
        data: user
      } = await this.supabase.get("/auth/v1/user", {
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      this.currentUser = user;
      const cookieName = `sb-${this.cfg.supabaseProject}-auth-token`;
      const cookieValue = encodeURIComponent(JSON.stringify([this.token, null, null, null, null]));
      this.cookieStore.set(cookieName, cookieValue);
      this.log(`Login Success! User: ${this.currentUser?.email}`, "success");
    } catch (e) {
      this.log(`Login Failed: ${e.response?.data?.msg || e.message}`, "error");
      throw e;
    }
  }
  async getCredits() {
    try {
      if (!this.token) await this.login();
      const {
        data
      } = await this.api.post("/credits", {});
      const creditVal = data?.credits !== undefined ? data.credits : data?.data?.credits || 0;
      return creditVal;
    } catch (error) {
      return 0;
    }
  }
  async waitForCredits(minCredits = 1) {
    let attempts = 0;
    while (attempts < 10) {
      const credits = await this.getCredits();
      if (credits >= minCredits) return credits;
      this.log(`Not enough credits (${credits}). Waiting...`, "process");
      await this.sleep(3e3);
      attempts++;
    }
    throw new Error("Insufficient credits timeout");
  }
  async upload(mediaInput) {
    if (!this.token) await this.login();
    try {
      let buffer, type = "jpeg";
      if (typeof mediaInput === "string" && mediaInput.startsWith("http")) {
        const res = await axios.get(mediaInput, {
          responseType: "arraybuffer",
          httpsAgent: this.agent
        });
        buffer = Buffer.from(res.data);
      } else if (Buffer.isBuffer(mediaInput)) {
        buffer = mediaInput;
      } else {
        return null;
      }
      const hex = buffer.toString("hex", 0, 4);
      if (hex === "89504e47") type = "png";
      if (hex === "ffd8ffe0" || hex === "ffd8ffe1") type = "jpeg";
      const base64 = `data:image/${type};base64,${buffer.toString("base64")}`;
      const {
        data
      } = await this.api.post("/cdn/upload-image", {
        imageSource: base64,
        imageType: type
      });
      return data?.url;
    } catch (e) {
      this.log(`Upload failed: ${e.message}`, "error");
      return null;
    }
  }
  async generate({
    session,
    model = this.cfg.defaultModel,
    prompt,
    media,
    mask_image,
    loras = [],
    poll = false,
    seed = -1,
    ...opts
  }) {
    if (session) {
      this.importSession(session);
    }
    if (!this.token || !await this.validateSession()) {
      this.log("Session invalid or expired, logging in...", "process");
      await this.login();
    }
    const modelConfig = this.cfg.models[model] || this.cfg.models["nano-banana-pro"];
    const isImage = modelConfig.type === "image";
    this.log(`Configuring [${modelConfig.id}]...`, "process");
    let payload = {
      model: modelConfig.id,
      prompt: prompt || "",
      enable_safety_checker: false,
      num_images: opts.num_images || 1,
      ...opts
    };
    if (isImage) {
      if (modelConfig.allow_ar) {
        payload.aspect_ratio = opts.aspect_ratio || this.cfg.defaultRatio;
      }
      if (modelConfig.allow_quality) {
        payload.quality = opts.quality || this.cfg.defaultQuality;
      }
      if (modelConfig.allow_seed && seed !== undefined) {
        payload.seed = seed;
      }
      if (modelConfig.allow_image || model === "edit-luma-modify") {
        if (media) {
          const inputs = Array.isArray(media) ? media : [media];
          const uploadedUrls = [];
          for (const m of inputs) {
            const u = await this.upload(m);
            if (u) uploadedUrls.push(u);
          }
          if (uploadedUrls.length > 0) {
            payload.image_urls = uploadedUrls;
          }
        }
      }
      if (modelConfig.allow_strength && opts.strength) {
        payload.strength = opts.strength;
      }
      if (mask_image) {
        const maskUrl = await this.upload(mask_image);
        if (maskUrl) payload.mask_image = maskUrl;
      }
      if (loras && loras.length > 0) {
        payload.loras = loras;
      }
      payload.style = "auto";
    } else if (modelConfig.type === "video") {
      if (!media || Array.isArray(media) && media.length === 0) {
        this.log("Video generation requires media input", "error");
        return null;
      }
      const inputs = Array.isArray(media) ? media : [media];
      const uploadedUrls = [];
      for (const m of inputs) {
        const u = await this.upload(m);
        if (u) uploadedUrls.push(u);
      }
      if (modelConfig.id === "volc-omnihuman") {
        payload.first_frame_image = uploadedUrls[0];
        payload.audio_url = uploadedUrls[1];
        delete payload.prompt;
      } else if (modelConfig.id === "sync-lipsync-v2-pro") {
        payload.video_url = uploadedUrls[0];
        payload.audio_url = uploadedUrls[1];
      }
    }
    try {
      await this.waitForCredits(1);
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      const {
        data
      } = await this.api.post(modelConfig.url, payload);
      const result = data?.data || data;
      if (poll && result?.task_id) {
        this.log(`Task ID: ${result.task_id} (Polling...)`, "success");
        return await this.status({
          task_id: result.task_id,
          status_url: modelConfig.status_url || this.cfg.statusEndpointDefault,
          poll: poll
        });
      }
      return {
        ...result,
        session: this.exportSession()
      };
    } catch (e) {
      const errDetail = e.response?.data?.error || e.message;
      this.log(`Gen Error [${model}]: ${errDetail}`, "error");
      return {
        error: errDetail,
        session: this.exportSession()
      };
    }
  }
  async status({
    session,
    task_id,
    status_url,
    poll = false
  }) {
    if (session) {
      this.importSession(session);
    }
    if (!this.token || !await this.validateSession()) {
      this.log("Session invalid, logging in...", "process");
      await this.login();
    }
    if (!task_id) {
      this.log("Status Error: missing task_id", "error");
      return null;
    }
    const endpoint = status_url || "/image-task-status";
    const maxRetries = poll ? 120 : 1;
    for (let i = 0; i < maxRetries; i++) {
      if (poll && i > 0) await this.sleep(3e3);
      try {
        const {
          data
        } = await this.api.get(endpoint, {
          params: {
            task_id: task_id
          }
        });
        const result = data?.data || data;
        const wrappedResult = {
          ...result,
          session: this.exportSession()
        };
        if (!poll) return wrappedResult;
        if (result.status === "SUCCEEDED") {
          this.log("Completed!", "success");
          return wrappedResult;
        } else if (result.status === "FAILED") {
          this.log(`Failed: ${result.error}`, "error");
          return null;
        }
        process.stdout.write(`\r[WAITING] ID: ${task_id.substring(0, 8)}... (${i * 3}s)`);
      } catch (e) {
        if (!poll) {
          this.log(`Status Check Error: ${e.message}`, "error");
          return null;
        }
      }
    }
    return null;
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
      actions: ["generate", "status"]
    });
  }
  const api = new ArtAny();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "A futuristic car driving through neon city"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.session || !params.task_id) {
          return res.status(400).json({
            error: "Parameter 'session' dan 'task_id' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              session: "xxxxxxxxx",
              task_id: "xxxxxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
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