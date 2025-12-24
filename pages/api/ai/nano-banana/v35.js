import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  randomBytes
} from "crypto";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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
async function followRedirects(client, url, headers, maxRedirects = 10) {
  let currentUrl = url;
  let redirectCount = 0;
  while (redirectCount < maxRedirects) {
    console.log(`\n[REQUEST ${redirectCount + 1}] ${currentUrl}`);
    let response;
    try {
      response = await client.get(currentUrl, {
        headers: headers,
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
    } catch (error) {
      if (error.response) {
        response = error.response;
      } else {
        throw error;
      }
    }
    console.log(`[RESPONSE ${redirectCount + 1}] Status: ${response.status}`);
    await logCookies(client.defaults.jar, currentUrl, `after req ${redirectCount + 1}`);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) {
        throw new Error(`Status ${response.status} redirect tanpa header location.`);
      }
      const nextUrl = new URL(location, currentUrl);
      console.log(`[REDIRECT ${redirectCount + 1}] -> ${nextUrl.href}`);
      currentUrl = nextUrl.href;
      redirectCount++;
    } else {
      return {
        finalUrl: currentUrl
      };
    }
  }
  throw new Error(`Terlalu banyak redirect (melebihi ${maxRedirects})`);
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
  async checkMessagesNanoBanana(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/https:\/\/nanobananai\.pro\/api\/auth\/verify-email\?token=[a-zA-Z0-9._-]+&callbackURL=\//);
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
class NanoBananaAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.baseURL = "https://nanobananai.pro";
    const commonHeaders = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: this.baseURL,
      referer: `${this.baseURL}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: `${this.baseURL}/api`,
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
  _generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
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
    console.log("\n====== MEMULAI PROSES REGISTRASI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const password = email;
    const name = email;
    const signupPayload = {
      email: email,
      password: password,
      name: name,
      callbackURL: "/"
    };
    console.log("Proses: Mengirim permintaan sign-up...");
    await this.api.post("/auth/sign-up/email", signupPayload, {
      headers: {
        "content-type": "application/json",
        referer: `${this.baseURL}/auth/register`
      }
    });
    await logCookies(this.cookieJar, this.baseURL, "AFTER SIGNUP");
    console.log("Proses: Pendaftaran berhasil, mencari link verifikasi...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesNanoBanana(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    console.log("\n====== MENGIKUTI REDIRECT CHAIN ======");
    const verifyClient = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    const browserHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "upgrade-insecure-requests": "1",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    await followRedirects(verifyClient, verificationLink, browserHeaders, 10);
    console.log("\n====== EKSTRAKSI SESI ======");
    await logCookies(this.cookieJar, this.baseURL, "AFTER VERIFY REDIRECTS");
    console.log("Proses: Mengambil sesi...");
    await sleep(1e3);
    const sessionResponse = await this.api.get("/auth/get-session", {
      headers: {
        referer: `${this.baseURL}/`,
        priority: "u=1, i"
      }
    });
    const sessionData = sessionResponse.data;
    if (!sessionData?.session?.token) {
      throw new Error("Gagal mendapatkan session token.");
    }
    await logCookies(this.cookieJar, this.baseURL, "AFTER GET-SESSION");
    console.log("\n[SUCCESS] Sesi berhasil dibuat!");
    console.log(`[TOKEN] ${sessionData.session.token.substring(0, 50)}...`);
    console.log(`[USER ID] ${sessionData.user.id}`);
    console.log("\n====== REGISTRASI SELESAI ======\n");
    return {
      ...sessionData,
      email: email,
      password: password
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru...");
      const sessionData = await this._performRegistration();
      const allCookies = await this.cookieJar.getCookies(this.baseURL);
      const cookiesMap = {};
      allCookies.forEach(c => {
        cookiesMap[c.key] = c.value;
      });
      const sessionToSave = JSON.stringify({
        session: sessionData.session,
        user: sessionData.user,
        email: sessionData.email,
        password: sessionData.password,
        cookies: cookiesMap
      });
      const sessionTitle = `nanobananai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        password: sessionData.password,
        userId: sessionData.user.id
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async _restoreCookiesFromSession(sessionData) {
    if (!sessionData.cookies) {
      console.log("[WARNING] Tidak ada cookies tersimpan di session.");
      return;
    }
    console.log("Proses: Memulihkan cookies dari session...");
    const cookieStrings = [];
    for (const [key, value] of Object.entries(sessionData.cookies)) {
      let domain = "nanobananai.pro";
      if (key.startsWith("_ga") || key.startsWith("_gcl") || key.startsWith("_clck") || key.startsWith("_clsk")) {
        domain = ".nanobananai.pro";
      }
      let attributes = `Domain=${domain}; Path=/`;
      if (key.includes("Secure")) {
        attributes += "; Secure";
      }
      if (key.includes("auth")) {
        attributes += "; SameSite=Lax";
      }
      const cookieString = `${key}=${value}; ${attributes}`;
      try {
        await this.cookieJar.setCookie(cookieString, this.baseURL);
        cookieStrings.push(key);
      } catch (e) {
        console.warn(`[WARNING] Gagal set cookie ${key}: ${e.message}`);
      }
    }
    console.log(`Proses: ${cookieStrings.length} cookies berhasil dipulihkan: ${cookieStrings.join(", ")}`);
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
    await this._restoreCookiesFromSession(sessionData);
    await logCookies(this.cookieJar, this.baseURL, "AFTER RESTORE");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async getModels({
    key,
    mode = "image_edit"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengambil daftar model untuk mode ${mode}...`);
      const response = await this.api.get("/workbench/models", {
        params: {
          mode: mode
        }
      });
      console.log("Proses: Daftar model berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses getModels gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async uploadImage({
    key,
    imageBuffer
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mengunggah gambar...");
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: `${this._random()}.jpg`,
        contentType: "image/jpeg"
      });
      const response = await this.api.post("/workbench/upload-image", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Gambar berhasil diunggah.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses uploadImage gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async generate({
    key,
    prompt,
    imageUrl,
    modelId,
    mode,
    ...options
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      if (!mode && !modelId) {
        mode = imageUrl ? "image_edit" : "text_to_image";
        modelId = imageUrl ? "google/nano-banana-edit" : "google/nano-banana";
      } else if (!mode) {
        mode = imageUrl ? "image_edit" : "text_to_image";
      } else if (!modelId) {
        if (mode === "text_to_image") {
          modelId = "google/nano-banana";
        } else if (mode === "image_edit") {
          modelId = "google/nano-banana-edit";
        } else {
          modelId = "nano-banana-pro";
        }
      }
      console.log(`Proses: Membuat gambar dengan model ${modelId} (mode: ${mode})...`);
      let referenceImageIds = [];
      if (imageUrl) {
        const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const url of imageUrls) {
          console.log(`Proses: Memproses gambar...`);
          let imageBuffer;
          if (Buffer.isBuffer(url)) {
            imageBuffer = url;
          } else if (url.startsWith("http")) {
            const response = await axios.get(url, {
              responseType: "arraybuffer"
            });
            imageBuffer = Buffer.from(response.data);
          } else {
            imageBuffer = Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
          }
          const uploadResult = await this.uploadImage({
            key: currentKey,
            imageBuffer: imageBuffer
          });
          referenceImageIds.push(uploadResult.fileId);
        }
      }
      const payload = {
        mode: mode,
        modelId: modelId,
        referenceImageIds: referenceImageIds,
        prompt: prompt,
        aspectRatio: options.aspectRatio || {
          mode: "auto"
        },
        advanced: {
          outputCount: options.outputCount || 1,
          resolution: options.resolution || "1K",
          outputFormat: options.outputFormat || "png",
          seed: options.seed || null
        }
      };
      const response = await this.api.post("/workbench/generate", payload, {
        headers: {
          "content-type": "application/json",
          referer: `${this.baseURL}/`,
          priority: "u=1, i"
        }
      });
      console.log("Proses: Tugas generate berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses generate gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async getTask({
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
      const response = await this.api.get(`/workbench/task/${taskId}`);
      console.log("Proses: Status berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses getTask gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("nanobananai-session-")).map(paste => paste.key);
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
  const api = new NanoBananaAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "models":
        response = await api.getModels(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.key || !params.taskId) {
          return res.status(400).json({
            error: "Parameter 'key' dan 'taskId' wajib diisi untuk action 'status'."
          });
        }
        response = await api.getTask(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'models', 'generate', 'status', 'list_key', 'del_key'.`
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