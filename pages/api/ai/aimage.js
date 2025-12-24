import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  randomBytes,
  createHash
} from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function base64URLEncode(str) {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest();
}
async function logCookies(jar, url, label) {
  try {
    const cookies = await jar.getCookies(url);
    console.log(`\n[COOKIES ${label}] URL: ${url}`);
    if (cookies.length === 0) {
      console.log("  - (Tidak ada cookie)");
      return;
    }
    cookies.forEach(c => {
      const valuePreview = c.value ? c.value.substring(0, 80) : "(null)";
      const ellipsis = c.value && c.value.length > 80 ? "..." : "";
      console.log(`  - ${c.key} = ${valuePreview}${ellipsis}`);
    });
  } catch (e) {
    console.error(`Gagal membaca cookie untuk ${url}: ${e.message}`);
  }
}
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
    });
  }
  async createEmail() {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      return response.data?.email;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createEmail': ${error.message}`);
      throw error;
    }
  }
  async checkMessagesAimage(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const messages = response.data?.data || [];
      for (const message of messages) {
        const content = message.text_content || message.html_content || "";
        const verifyMatch = content.match(/https:\/\/aimage\.ai\/api\/auth\/verify-email\?token=([^&\s]+)/);
        if (verifyMatch) {
          return verifyMatch[0];
        }
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesAimage' untuk email ${email}: ${error.message}`);
      return null;
    }
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
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createPaste': ${error.message}`);
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
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.getPaste' untuk kunci ${key}: ${error.message}`);
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
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.listPastes': ${error.message}`);
      return [];
    }
  }
  async delPaste(key) {
    try {
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "delete",
          key: key
        }
      });
      return response.data || null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.delPaste' untuk kunci ${key}: ${error.message}`);
      return false;
    }
  }
}
class AImageAI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://aimage.ai/api",
        auth: {
          signUp: "/auth/sign-up/email",
          signIn: "/auth/sign-in/email",
          verifyEmail: "/auth/verify-email",
          getSession: "/auth/get-session"
        },
        generate: "/generate-image",
        taskStatus: "/task-status"
      },
      styles: ["realistic", "anime", "artistic", "cinematic", "fantasy", "minimalist"],
      sizes: ["1:1", "2:3", "3:2", "16:9", "9:16"]
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://aimage.ai",
      referer: "https://aimage.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: this.config.endpoints.base,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "*/*",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      }
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  _generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + "A1";
  }
  async _convertImageToBase64(imageUrl) {
    let imageBase64;
    if (Buffer.isBuffer(imageUrl)) {
      imageBase64 = `data:image/png;base64,${imageUrl.toString("base64")}`;
    } else if (imageUrl.startsWith("http")) {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      imageBase64 = `data:image/png;base64,${Buffer.from(response.data).toString("base64")}`;
    } else if (imageUrl.startsWith("data:")) {
      imageBase64 = imageUrl;
    } else {
      throw new Error("Format imageUrl tidak didukung");
    }
    return imageBase64;
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.session?.token) throw new Error("Token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI AIMAGE AI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const password = this._generatePassword();
    const name = `User${this._random().substring(0, 6)}`;
    const signupPayload = {
      email: email,
      password: password,
      name: name,
      callbackURL: "/"
    };
    console.log("Proses: Mendaftarkan akun...");
    const signupResponse = await this.api.post(this.config.endpoints.auth.signUp, signupPayload);
    if (signupResponse.status !== 200) {
      throw new Error(`Gagal mendaftar: ${signupResponse.statusText}`);
    }
    console.log("Proses: Pendaftaran berhasil, mencari link verifikasi email...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesAimage(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    console.log("Proses: Memverifikasi email...");
    const verifyResponse = await this.api.get(verificationLink, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "upgrade-insecure-requests": "1",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none"
      }
    });
    if (verifyResponse.status !== 200) {
      throw new Error(`Gagal verifikasi email: ${verifyResponse.statusText}`);
    }
    console.log("Proses: Mendapatkan session...");
    const sessionResponse = await this.api.get(this.config.endpoints.auth.getSession);
    if (!sessionResponse.data?.session?.token) {
      throw new Error("Gagal mendapatkan session setelah verifikasi");
    }
    console.log("\n[SUCCESS] Registrasi AImage AI berhasil!");
    console.log(`[USER] ${sessionResponse.data.user.name} (${sessionResponse.data.user.email})`);
    console.log(`[TOKEN] ${sessionResponse.data.session.token.substring(0, 50)}...`);
    return {
      ...sessionResponse.data,
      email: email,
      password: password
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi AImage AI baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        session: sessionData.session,
        user: sessionData.user,
        email: sessionData.email,
        password: sessionData.password
      });
      const sessionTitle = `aimageai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi AImage AI baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        user: sessionData.user,
        email: sessionData.email,
        password: sessionData.password
      };
    } catch (error) {
      console.error(`Proses registrasi AImage AI gagal: ${error.message}`);
      throw error;
    }
  }
  async login({
    email,
    password
  }) {
    try {
      console.log(`Proses: Mencoba login dengan email: ${email}`);
      const loginPayload = {
        email: email,
        password: password,
        callbackURL: "/"
      };
      const response = await this.api.post(this.config.endpoints.auth.signIn, loginPayload, {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i"
        }
      });
      if (response.status !== 200) {
        throw new Error(`Gagal login: ${response.statusText}`);
      }
      console.log("Proses: Login berhasil, mendapatkan session...");
      const sessionResponse = await this.api.get(this.config.endpoints.auth.getSession);
      if (!sessionResponse.data?.session?.token) {
        throw new Error("Gagal mendapatkan session setelah login");
      }
      const sessionData = {
        session: sessionResponse.data.session,
        user: sessionResponse.data.user,
        email: email,
        password: password
      };
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `aimageai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi login ke Wudysoft.");
      console.log(`-> Sesi login berhasil disimpan. Kunci Anda: ${newKey}`);
      await this.cookieJar.setCookie(`__Secure-better-auth.session_token=${sessionData.session.token}; Domain=.aimage.ai; Path=/; Secure; SameSite=Lax`, "https://aimage.ai");
      console.log("\n[SUCCESS] Login AImage AI berhasil!");
      console.log(`[USER] ${sessionData.user.name} (${sessionData.user.email})`);
      console.log(`[TOKEN] ${sessionData.session.token.substring(0, 50)}...`);
      return {
        key: newKey,
        user: sessionData.user,
        email: email,
        password: password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses login gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async _ensureValidSession({
    key
  }) {
    let sessionData;
    let currentKey = key;
    if (key) {
      try {
        sessionData = await this._getTokenFromKey(key);
      } catch (error) {
        console.warn(`[PERINGATAN] ${error.message}. Mendaftarkan sesi baru...`);
      }
    }
    if (!sessionData) {
      console.log("Proses: Kunci tidak valid atau tidak disediakan, mendaftarkan sesi baru...");
      const newSession = await this.register();
      if (!newSession?.key) throw new Error("Gagal mendaftarkan sesi baru.");
      console.log(`-> PENTING: Simpan kunci baru ini: ${newSession.key}`);
      currentKey = newSession.key;
      sessionData = await this._getTokenFromKey(currentKey);
    }
    const sessionToken = sessionData.session.token;
    await this.cookieJar.setCookie(`__Secure-better-auth.session_token=${sessionToken}; Domain=.aimage.ai; Path=/; Secure; SameSite=Lax`, "https://aimage.ai");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi AImage AI...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("aimageai-session-")).map(paste => paste.key);
    } catch (error) {
      console.error("Gagal mengambil daftar kunci:", error.message);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) {
      console.error("Kunci tidak disediakan untuk dihapus.");
      return false;
    }
    try {
      console.log(`Proses: Mencoba menghapus kunci: ${key}`);
      const success = await this.wudysoft.delPaste(key);
      console.log(success ? `Kunci ${key} berhasil dihapus.` : `Gagal menghapus kunci ${key}.`);
      return success;
    } catch (error) {
      console.error(`Terjadi error saat menghapus kunci ${key}:`, error.message);
      throw error;
    }
  }
  async generate({
    key,
    prompt = PROMPT.text,
    style = "realistic",
    size = "2:3",
    imageUrl = []
  }) {
    if (!this.config.styles.includes(style)) {
      throw new Error(`Style "${style}" tidak valid. Pilihan: ${this.config.styles.join(", ")}`);
    }
    if (!this.config.sizes.includes(size)) {
      throw new Error(`Size "${size}" tidak valid. Pilihan: ${this.config.sizes.join(", ")}`);
    }
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dengan prompt: "${prompt}"`);
      console.log(`Style: ${style}, Size: ${size}`);
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
      const referenceImages = [];
      if (imageUrls.length > 0) {
        console.log(`Proses: Mengkonversi ${imageUrls.length} reference image ke base64...`);
        for (const url of imageUrls) {
          try {
            const imageBase64 = await this._convertImageToBase64(url);
            referenceImages.push(imageBase64);
            console.log(`-> Berhasil mengkonversi image dari ${url}`);
          } catch (error) {
            console.warn(`[PERINGATAN] Gagal mengkonversi image dari ${url}: ${error.message}`);
          }
        }
        console.log(`Proses: ${referenceImages.length} reference image berhasil diproses`);
      }
      const payload = {
        prompt: prompt,
        style: style,
        size: size,
        referenceImages: referenceImages
      };
      const response = await this.api.post(this.config.endpoints.generate, payload);
      if (!response.data?.taskId) {
        throw new Error("Gagal membuat task generate image");
      }
      console.log("Proses: Task generate image berhasil dibuat.");
      console.log(`Task ID: ${response.data.taskId}`);
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses generate image gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    task_id: taskId
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk taskId ${taskId}...`);
      const response = await this.api.get(this.config.endpoints.taskStatus, {
        params: {
          taskId: taskId
        }
      });
      console.log("Proses: Status berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses status gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async user_info({
    key
  }) {
    try {
      const {
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      return {
        user: sessionData.user,
        session: sessionData.session,
        email: sessionData.email,
        password: sessionData.password
      };
    } catch (error) {
      console.error(`Gagal mendapatkan info user: ${error.message}`);
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AImageAI();
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
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi untuk action 'status'."
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
      case "user_info":
        response = await api.user_info(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'generate', 'status', 'list_key', 'del_key', 'user_info'.`
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