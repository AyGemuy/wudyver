import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import {
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`,
      timeout: 3e4,
      maxRedirects: 5
    });
  }
  async createPaste(title, content) {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "create",
          title: title,
          content: content
        }
      });
      return response.data?.key || null;
    } catch (error) {
      console.error("[WUDYSOFT] createPaste failed:", error.response?.data || error.message);
      throw error;
    }
  }
  async getPaste(key) {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "get",
          key: key
        }
      });
      return response.data?.content || null;
    } catch (error) {
      console.error("[WUDYSOFT] getPaste failed:", error.response?.data || error.message);
      return null;
    }
  }
  async listPastes() {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "list"
        }
      });
      return response.data || [];
    } catch (error) {
      console.error("[WUDYSOFT] listPastes failed:", error.response?.data || error.message);
      return [];
    }
  }
  async deletePaste(key) {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "delete",
          key: key
        }
      });
      return response.data?.success || false;
    } catch (error) {
      console.error("[WUDYSOFT] deletePaste failed:", error.response?.data || error.message);
      return false;
    }
  }
}
class ExsiteAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 3e4,
      maxRedirects: 5,
      validateStatus: function(status) {
        return status >= 200 && status < 400;
      }
    }));
    this.csrfToken = null;
    this.socketId = null;
    this.sessionKey = null;
    this.userData = null;
    this.wudysoft = new WudysoftAPI();
  }
  log = console.log;
  error = console.error;
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  models = {
    openai: {
      id: 32,
      field: "description",
      defaults: {
        size: "1024x1024",
        quality: "standard",
        image_style: "",
        image_lighting: "",
        image_mood: "",
        image_number_of_images: "1"
      }
    },
    "gpt-image-1": {
      id: 32,
      field: "stable_description",
      defaults: {
        size: "1024x1024",
        quality: "standard",
        image_style: "",
        image_lighting: "",
        image_mood: "",
        image_number_of_images: "1"
      }
    },
    stable_diffusion: {
      id: 32,
      field: "stable_description",
      defaults: {
        type: "text-to-image",
        negative_prompt: "",
        style_preset: "",
        image_mood: "",
        sampler: "",
        clip_guidance_preset: "",
        image_resolution: "1x1",
        image_number_of_images: "1"
      }
    },
    midjourney: {
      id: 32,
      field: "description_midjourney",
      defaults: {
        model: "midjourney",
        image_generator: "midjourney",
        image_number_of_images: "1",
        image_mood: "null",
        size: "null",
        image_style: "null",
        image_lighting: "null",
        quality: "null",
        type: "null",
        stable_description: "null",
        negative_prompt: "null",
        style_preset: "null",
        sampler: "null",
        clip_guidance_preset: "null",
        image_resolution: "1x1",
        description: ""
      }
    }
  };
  base = "https://ai.exsite.app";
  headers() {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      origin: this.base,
      referer: `${this.base}/dashboard/user/openai/generator/ai_image_generator`,
      priority: "u=1, i",
      ...SpoofHead()
    };
  }
  async _verifyAndFollowRedirects(response, operation) {
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      this.log(`[REDIRECT] Mengikuti redirect untuk ${operation}...`);
      const redirectUrl = response.headers.location;
      if (redirectUrl) {
        return await this.client.get(redirectUrl);
      }
    }
    return response;
  }
  async _verifySession() {
    try {
      this.log("[SESSION] Memverifikasi session...");
      const response = await this.client.get(`${this.base}/dashboard`, {
        headers: this.headers()
      });
      const html = response.data;
      const isLoggedIn = html.includes("user-menu") || html.includes("dashboard") || !html.includes("login");
      if (!isLoggedIn) {
        throw new Error("Session expired - tidak terdeteksi login");
      }
      const newCsrf = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
      const newSocket = html.match(/"socketId":"([^"]+)"/)?.[1];
      if (newCsrf) {
        this.csrfToken = newCsrf;
        this.log("[SESSION] CSRF token diperbarui");
      }
      if (newSocket) {
        this.socketId = newSocket;
        this.log("[SESSION] Socket ID diperbarui");
      }
      return true;
    } catch (error) {
      this.error("[SESSION] Verifikasi gagal:", error.message);
      return false;
    }
  }
  async _getSessionFromKey(key) {
    this.log(`[SESSION] Memuat session dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Session dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.user?.email) throw new Error("Data user tidak valid dalam session tersimpan.");
      this.log("[SESSION] Session berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat session: ${e.message}`);
    }
  }
  async _ensureValidSession({
    key
  }) {
    let sessionData;
    let currentKey = key;
    if (key) {
      try {
        sessionData = await this._getSessionFromKey(key);
        this.sessionKey = key;
        this.userData = sessionData.user;
        this.csrfToken = sessionData.csrfToken;
        this.socketId = sessionData.socketId;
        this.jar = CookieJar.fromJSON(JSON.stringify(sessionData.cookieJar));
        this.client = wrapper(axios.create({
          jar: this.jar,
          timeout: 3e4,
          maxRedirects: 5,
          validateStatus: function(status) {
            return status >= 200 && status < 400;
          }
        }));
        const isValid = await this._verifySession();
        if (!isValid) {
          throw new Error("Session expired");
        }
        this.log("[SESSION] Session valid dan aktif");
        return {
          sessionData: sessionData,
          key: currentKey
        };
      } catch (error) {
        this.error(`[SESSION] Gagal load session dari key ${key}:`, error.message);
        sessionData = null;
      }
    }
    if (!sessionData) {
      this.log("[SESSION] Membuat session baru...");
      const newSession = await this.register();
      if (!newSession?.key) {
        throw new Error("Gagal membuat session baru");
      }
      currentKey = newSession.key;
      sessionData = await this._getSessionFromKey(currentKey);
      this.log(`[SESSION] Session baru dibuat: ${currentKey}`);
    }
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async register() {
    try {
      this.log("\n====== MEMULAI PROSES REGISTRASI EXSITE AI ======");
      const name = `User${this._random().substring(0, 8)}`;
      const email = `${this._random()}@emailhook.site`;
      const password = `${this._random()}A1!`;
      this.log(`[REGISTER] Membuat akun: ${email}`);
      const form = new FormData();
      form.append("name", name);
      form.append("surname", name + "x");
      form.append("email", email);
      form.append("password", password);
      form.append("password_confirmation", password);
      form.append("plan", "");
      form.append("affiliate_code", "");
      const headers = {
        ...this.headers(),
        "content-type": form.getHeaders()["content-type"],
        referer: `${this.base}/register`
      };
      this.log("[REGISTER] Melakukan pendaftaran...");
      const registerResponse = await this.client.post(`${this.base}/register`, form.getBuffer(), {
        headers: headers
      });
      await this._verifyAndFollowRedirects(registerResponse, "register");
      this.log("[REGISTER] Berhasil mendaftar, memuat dashboard...");
      await this.dash();
      const sessionData = {
        user: {
          name: name,
          email: email,
          password: password
        },
        csrfToken: this.csrfToken,
        socketId: this.socketId,
        cookieJar: this.jar.toJSON()
      };
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `exsite-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan session Exsite AI baru.");
      this.sessionKey = newKey;
      this.userData = sessionData.user;
      this.log("\n[SUCCESS] Registrasi Exsite AI berhasil!");
      this.log(`[SESSION] Kunci: ${newKey}`);
      this.log(`[USER] ${name} (${email})`);
      return {
        key: newKey,
        email: email,
        name: name,
        user: {
          name: name,
          email: email
        }
      };
    } catch (error) {
      this.error("[REGISTER] Gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  async login({
    email,
    password
  }) {
    try {
      this.log(`[LOGIN] Mencoba login dengan email: ${email}`);
      const form = new FormData();
      form.append("email", email);
      form.append("password", password);
      form.append("remember", "on");
      const headers = {
        ...this.headers(),
        "content-type": form.getHeaders()["content-type"],
        referer: `${this.base}/login`
      };
      const loginResponse = await this.client.post(`${this.base}/login`, form.getBuffer(), {
        headers: headers
      });
      await this._verifyAndFollowRedirects(loginResponse, "login");
      await this.dash();
      const sessionData = {
        user: {
          email: email,
          password: password,
          name: `User${this._random().substring(0, 8)}`
        },
        csrfToken: this.csrfToken,
        socketId: this.socketId,
        cookieJar: this.jar.toJSON()
      };
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `exsite-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan session login.");
      this.log("[LOGIN] Berhasil login dan menyimpan session");
      return {
        key: newKey,
        email: email,
        user: sessionData.user
      };
    } catch (error) {
      this.error("[LOGIN] Gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  async generate({
    key,
    model = "midjourney",
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      if (!this.csrfToken) throw new Error("CSRF token missing");
      if (!this.models[model]) throw new Error(`Model "${model}" not supported`);
      const config = this.models[model];
      const isImg = !!imageUrl;
      const payload = {
        post_type: "ai_image_generator",
        openai_id: String(config.id),
        custom_template: "0",
        ...config.defaults,
        [config.field]: prompt || "",
        description: model === "midjourney" ? prompt || "" : "",
        ...rest
      };
      if (model === "stable_diffusion") {
        payload.type = isImg ? "image-to-image" : "text-to-image";
      }
      if (isImg) {
        payload.image_src = await this._uploadImage(imageUrl);
      }
      const form = new FormData();
      for (const [k, v] of Object.entries(payload)) {
        if (v != null) {
          if (v && typeof v === "object" && v.value && v.options) {
            form.append(k, v.value, v.options);
          } else {
            form.append(k, String(v));
          }
        }
      }
      const headers = {
        ...this.headers(),
        "content-type": form.getHeaders()["content-type"],
        "x-csrf-token": this.csrfToken,
        "x-socket-id": this.socketId || "x"
      };
      this.log(`[GENERATE] ${isImg ? "img2img" : "txt2img"} → ${model}`);
      const response = await this.client.post(`${this.base}/dashboard/user/openai/generate`, form.getBuffer(), {
        headers: headers
      });
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      this.error("[GENERATE] Gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  async status({
    key,
    task_id,
    offset = 0
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const headers = {
        ...this.headers(),
        "x-csrf-token": this.csrfToken,
        "x-socket-id": this.socketId || "x"
      };
      this.log(`[STATUS] Mengecek status, offset: ${offset}`);
      const response = await this.client.get(`${this.base}/dashboard/user/openai/generate/lazyload`, {
        headers: headers,
        params: {
          offset: offset,
          post_type: "ai_image_generator"
        }
      });
      let data = response.data;
      if (task_id && data.html) {
        const containsTask = data.html.includes(task_id);
        if (!containsTask) {
          data.html = "Task not found or not completed yet";
        }
      }
      return {
        ...data,
        key: currentKey
      };
    } catch (error) {
      this.error("[STATUS] Gagal:", error.response?.data || error.message);
      throw error;
    }
  }
  async list_key() {
    try {
      this.log("[LIST_KEY] Mengambil daftar kunci session...");
      const allPastes = await this.wudysoft.listPastes();
      const sessionKeys = allPastes.filter(paste => paste.title && paste.title.startsWith("exsite-session-")).map(paste => paste.key);
      this.log(`[LIST_KEY] Ditemukan ${sessionKeys.length} kunci`);
      return sessionKeys;
    } catch (error) {
      this.error("[LIST_KEY] Gagal:", error.message);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) {
      throw new Error("Paramenter 'key' wajib diisi");
    }
    try {
      this.log(`[DEL_KEY] Menghapus kunci: ${key}`);
      const success = await this.wudysoft.deletePaste(key);
      if (this.sessionKey === key) {
        this.sessionKey = null;
        this.csrfToken = null;
        this.socketId = null;
        this.userData = null;
      }
      if (success) {
        this.log(`[DEL_KEY] Kunci ${key} berhasil dihapus`);
        return {
          success: true,
          key: key
        };
      } else {
        throw new Error("Gagal menghapus kunci");
      }
    } catch (error) {
      this.error(`[DEL_KEY] Gagal menghapus kunci ${key}:`, error.message);
      throw error;
    }
  }
  async dash() {
    try {
      const response = await this.client.get(`${this.base}/dashboard`, {
        headers: this.headers()
      });
      const html = response.data;
      const newCsrf = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
      const newSocket = html.match(/"socketId":"([^"]+)"/)?.[1];
      if (newCsrf) this.csrfToken = newCsrf;
      if (newSocket) this.socketId = newSocket;
      this.log("[DASH] Dashboard loaded");
    } catch (error) {
      this.error("[DASH] Gagal:", error.message);
      throw error;
    }
  }
  async _uploadImage(imageUrl) {
    if (!imageUrl) return null;
    let buffer, filename = "image.jpg",
      contentType = "image/jpeg";
    if (Buffer.isBuffer(imageUrl)) {
      buffer = imageUrl;
    } else if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 3e4
        });
        buffer = Buffer.from(response.data);
        contentType = response.headers["content-type"] || contentType;
      } else if (imageUrl.startsWith("data:")) {
        const match = imageUrl.match(/^data:([^;]+);/);
        if (match) contentType = match[1];
        buffer = Buffer.from(imageUrl.split(",")[1], "base64");
      } else {
        throw new Error("Format imageUrl tidak didukung");
      }
    } else {
      throw new Error("imageUrl harus berupa URL, base64, atau Buffer");
    }
    return {
      value: buffer,
      options: {
        filename: filename,
        contentType: contentType
      }
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new ExsiteAI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "login":
        if (!params.email || !params.password) {
          return res.status(400).json({
            error: "Paramenter 'email' dan 'password' wajib diisi untuk action 'login'."
          });
        }
        response = await api.login(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'del_key'."
          });
        }
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'generate', 'status', 'list_key', 'del_key'.`
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