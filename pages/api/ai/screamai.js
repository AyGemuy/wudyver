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
  async checkMessages(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/\b\d{6}\b/);
        return match ? match[0] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessages' untuk email ${email}: ${error.message}`);
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
class ScreamAI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://screamai.io/api",
        auth: {
          sendCode: "/auth/send-code",
          csrf: "/auth/csrf",
          callback: "/auth/callback/email-code",
          session: "/auth/session"
        },
        user: "/get-user-info",
        generate: "/image/generate",
        taskStatus: taskId => `/image/task-status/${taskId}`
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://screamai.io",
      referer: "https://screamai.io/",
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
  async _getSessionFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.sessionToken) throw new Error("Token session tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI DREAMYY2K ======");
    try {
      await this.cookieJar.removeAllCookies();
    } catch (e) {
      console.log("Tidak ada cookie lama yang perlu dibuang");
    }
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    console.log("Proses: Mendapatkan CSRF token...");
    const csrfResponse = await this.api.get(this.config.endpoints.auth.csrf);
    const csrfToken = csrfResponse.data.csrfToken;
    if (!csrfToken) throw new Error("Gagal mendapatkan CSRF token.");
    console.log(`Proses: CSRF token didapat: ${csrfToken.substring(0, 20)}...`);
    console.log("Proses: Mengirim kode verifikasi...");
    const sendCodePayload = {
      email: email
    };
    await this.api.post(this.config.endpoints.auth.sendCode, sendCodePayload);
    console.log("Proses: Kode verifikasi berhasil dikirim, menunggu email...");
    let verificationCode = null;
    for (let i = 0; i < 60; i++) {
      verificationCode = await this.wudysoft.checkMessages(email);
      if (verificationCode) break;
      console.log(`Proses: Menunggu kode verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationCode) throw new Error("Gagal menemukan kode verifikasi setelah 3 menit.");
    console.log(`Proses: Kode verifikasi ditemukan: ${verificationCode}`);
    console.log("Proses: Memverifikasi kode...");
    const callbackPayload = new URLSearchParams({
      email: email,
      code: verificationCode,
      redirect: "false",
      csrfToken: csrfToken,
      callbackUrl: "https://screamai.io/"
    }).toString();
    const callbackResponse = await this.api.post(this.config.endpoints.auth.callback, callbackPayload, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-auth-return-redirect": "1"
      }
    });
    console.log("Proses: Verifikasi kode berhasil");
    console.log("Proses: Mendapatkan session...");
    const sessionResponse = await this.api.get(this.config.endpoints.auth.session);
    const userSession = sessionResponse.data;
    if (!userSession?.user?.uuid) {
      throw new Error("Gagal mendapatkan session user.");
    }
    console.log(`Proses: Session berhasil didapat untuk user: ${userSession.user.uuid}`);
    console.log("Proses: Mendapatkan info user...");
    const userInfoResponse = await this.api.post(this.config.endpoints.user, {}, {
      headers: {
        "content-length": "0"
      }
    });
    const userInfo = userInfoResponse.data;
    if (userInfo.code !== 0) {
      throw new Error("Gagal mendapatkan info user.");
    }
    console.log(`Proses: User info berhasil didapat. Credits: ${userInfo.data.credits.left_credits}`);
    const dreamyCookies = await this.cookieJar.getCookies("https://screamai.io");
    const sessionCookie = dreamyCookies.find(cookie => cookie.key === "__Secure-authjs.session-token");
    if (!sessionCookie?.value) {
      throw new Error("Gagal mengekstrak session token dari cookies.");
    }
    const sessionData = {
      sessionToken: sessionCookie.value,
      userInfo: userInfo.data,
      email: email,
      expires: userSession.expires
    };
    console.log("\n[SUCCESS] Sesi ScreamAI berhasil dibuat!");
    console.log(`[USER] ${userInfo.data.nickname}`);
    console.log(`[CREDITS] ${userInfo.data.credits.left_credits}`);
    console.log("\n====== REGISTRASI DREAMYY2K SELESAI ======\n");
    return sessionData;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi ScreamAI baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `screamai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi ScreamAI baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        userInfo: sessionData.userInfo
      };
    } catch (error) {
      console.error(`Proses registrasi ScreamAI gagal: ${error.message}`);
      throw error;
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
      sessionData = await this._getSessionFromKey(currentKey);
    }
    await this.cookieJar.setCookie(`__Secure-authjs.session-token=${sessionData.sessionToken}; Domain=screamai.io; Path=/; Secure; SameSite=Lax`, "https://screamai.io");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi ScreamAI...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("screamai-session-")).map(paste => paste.key);
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
    imageUrl
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dengan ScreamAI...`);
      console.log(`Proses: Credits tersedia: ${sessionData.userInfo.credits.left_credits}`);
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
      const generatePayload = {
        image_url: imageBase64,
        prompt: prompt
      };
      console.log("Proses: Mengirim permintaan generate gambar...");
      const response = await this.api.post(this.config.endpoints.generate, generatePayload);
      if (response.data.code !== 0) {
        throw new Error(response.data.message || "Gagal membuat tugas generate");
      }
      console.log("Proses: Tugas generate berhasil dibuat.");
      console.log(`Proses: Task UUID: ${response.data.data.task_uuid}`);
      console.log(`Proses: Credits tersisa: ${response.data.data.credits_left}`);
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses generate ScreamAI gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    task_id
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk task_id ${task_id}...`);
      const response = await this.api.get(this.config.endpoints.taskStatus(task_id));
      if (response.data.code !== 0) {
        throw new Error(response.data.message || "Gagal mendapatkan status");
      }
      console.log(`Proses: Status: ${response.data.data.status}`);
      if (response.data.data.status === "completed") {
        console.log(`Proses: Gambar selesai: ${response.data.data.output_image_url}`);
      }
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses status ScreamAI gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async user_info({
    key
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      return {
        code: 0,
        message: "ok",
        data: sessionData.userInfo,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses user_info ScreamAI gagal: ${errorMessage}`);
      throw new Error(errorMessage);
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
  const api = new ScreamAI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "generate":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
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
      case "status":
        if (!params.key || !params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'key' dan 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "user_info":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'user_info'."
          });
        }
        response = await api.user_info(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'generate', 'list_key', 'del_key', 'status', 'user_info'.`
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