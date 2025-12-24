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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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
  async checkMessagesSoar2(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/(\d{6})/);
        return match ? match[0] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesSoar2' untuk email ${email}: ${error.message}`);
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
class Soar2AIAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://soar2.ai/api",
        auth: {
          emailVerification: "/auth/email-verification",
          csrf: "/auth/csrf",
          callback: "/auth/callback/email-verification",
          session: "/auth/session",
          userInfo: "/get-user-info"
        },
        video: {
          create: "/video-generation-sora2/create",
          status: "/video-generation-sora2/status"
        }
      },
      models: {
        video: {
          sora2: {
            name: "sora2",
            aspectRatios: ["landscape", "portrait", "square"],
            modelTypes: ["fast", "quality"],
            generationTypes: ["text", "image"]
          }
        }
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://soar2.ai",
      referer: "https://soar2.ai/generator",
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
  async _processImageInputForVideo(imageInput) {
    if (Array.isArray(imageInput)) {
      return await Promise.all(imageInput.map(img => this._processSingleImageForVideo(img)));
    }
    return [await this._processSingleImageForVideo(imageInput)];
  }
  async _processSingleImageForVideo(imageInput) {
    try {
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          console.log("Proses: Mengonversi URL gambar ke base64 untuk video...");
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          const base64 = Buffer.from(response.data).toString("base64");
          const contentType = response.headers["content-type"] || "image/jpeg";
          return `data:${contentType};base64,${base64}`;
        } else if (imageInput.startsWith("data:")) {
          return imageInput;
        } else {
          return `data:image/jpeg;base64,${imageInput}`;
        }
      } else if (Buffer.isBuffer(imageInput)) {
        const base64 = imageInput.toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      }
      throw new Error("Format gambar tidak didukung untuk video");
    } catch (error) {
      console.error("Error processing image for video:", error);
      throw error;
    }
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.sessionToken) throw new Error("Session token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI SOAR2 AI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    await this.cookieJar.setCookie(`NEXT_LOCALE=en; Domain=.soar2.ai; Path=/; Secure; SameSite=Lax`, "https://soar2.ai");
    console.log("Proses: Mendapatkan CSRF token...");
    const csrfResponse = await this.api.get(this.config.endpoints.auth.csrf, {
      headers: {
        "content-type": "application/json"
      }
    });
    const csrfToken = csrfResponse.data?.csrfToken;
    if (!csrfToken) throw new Error("Gagal mendapatkan CSRF token");
    console.log("Proses: CSRF token didapatkan");
    console.log("Proses: Mengirim kode verifikasi...");
    await this.api.post(this.config.endpoints.auth.emailVerification, {
      email: email
    }, {
      headers: {
        "content-type": "application/json"
      }
    });
    console.log("Proses: Menunggu kode verifikasi...");
    let verificationCode = null;
    for (let i = 0; i < 60; i++) {
      verificationCode = await this.wudysoft.checkMessagesSoar2(email);
      if (verificationCode) break;
      console.log(`Proses: Menunggu kode verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationCode) throw new Error("Gagal menemukan kode verifikasi setelah 3 menit.");
    console.log(`Proses: Kode verifikasi ditemukan: ${verificationCode}`);
    console.log("Proses: Memverifikasi kode...");
    const callbackResponse = await this.api.post(`${this.config.endpoints.auth.callback}?`, `email=${encodeURIComponent(email)}&code=${verificationCode}&redirect=false&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=https%3A%2F%2Fsoar2.ai%2Fgenerator`, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-auth-return-redirect": "1"
      }
    });
    console.log("Proses: Mendapatkan info sesi...");
    const sessionResponse = await this.api.get(this.config.endpoints.auth.session, {
      headers: {
        "content-type": "application/json"
      }
    });
    console.log("Proses: Mendapatkan info user...");
    const userInfoResponse = await this.api.post(this.config.endpoints.auth.userInfo, {}, {
      headers: {
        "content-type": "application/json"
      }
    });
    const cookies = await this.cookieJar.getCookies("https://soar2.ai");
    const sessionCookie = cookies.find(cookie => cookie.key === "__Secure-authjs.session-token");
    if (!sessionCookie?.value) {
      throw new Error("Gagal mendapatkan session token setelah login.");
    }
    const sessionData = {
      sessionToken: sessionCookie.value,
      email: email,
      userInfo: userInfoResponse.data,
      session: sessionResponse.data
    };
    console.log("\n[SUCCESS] Registrasi Soar2 AI berhasil!");
    return sessionData;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi Soar2 AI baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `soar2ai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi Soar2 AI baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        userInfo: sessionData.userInfo
      };
    } catch (error) {
      console.error(`Proses registrasi Soar2 AI gagal: ${error.message}`);
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
    await this.cookieJar.setCookie(`__Secure-authjs.session-token=${sessionData.sessionToken}; Domain=.soar2.ai; Path=/; Secure; SameSite=Lax`, "https://soar2.ai");
    await this.cookieJar.setCookie(`NEXT_LOCALE=en; Domain=.soar2.ai; Path=/; Secure; SameSite=Lax`, "https://soar2.ai");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async video({
    key,
    prompt,
    aspect_ratio = "landscape",
    modelType = "fast",
    generationType = "text",
    images = [],
    isPublic = false
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dengan model Soar2 AI...`);
      let payload = {
        prompt: prompt,
        aspect_ratio: aspect_ratio,
        modelType: modelType,
        generationType: generationType,
        isPublic: isPublic
      };
      if (generationType === "image" && images.length > 0) {
        console.log("Proses: Memproses gambar untuk video generation...");
        const processedImages = await this._processImageInputForVideo(images);
        if (processedImages.length > 0) {
          payload.image = processedImages[0];
        }
      }
      console.log("Proses: Payload untuk video generation:", {
        prompt: payload.prompt.substring(0, 50) + "...",
        aspect_ratio: payload.aspect_ratio,
        modelType: payload.modelType,
        generationType: payload.generationType,
        hasImage: !!payload.image
      });
      const response = await this.api.post(this.config.endpoints.video.create, payload);
      console.log("Proses: Permintaan video berhasil dibuat");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pembuatan video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    taskId
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk taskId ${taskId}...`);
      const response = await this.api.post(this.config.endpoints.video.status, {
        taskId: taskId
      });
      console.log("Proses: Status berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pengecekan status gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async userInfo({
    key
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mendapatkan info user...");
      const response = await this.api.post(this.config.endpoints.auth.userInfo, {});
      console.log("Proses: Info user berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses mendapatkan info user gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi Soar2 AI...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("soar2ai-session-")).map(paste => paste.key);
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
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new Soar2AIAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'video'."
          });
        }
        response = await api.video(params);
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "userInfo":
        response = await api.userInfo(params);
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) {
          return res.status(400).json({
            error: "Parameter 'key' wajib diisi untuk action 'del_key'."
          });
        }
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'video', 'status', 'userInfo', 'list_key', 'del_key'.`
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