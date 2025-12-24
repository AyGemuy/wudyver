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
      console.log("Proses: Membuat email sementara...");
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      const email = response.data?.email;
      if (!email) throw new Error("Email tidak ditemukan");
      console.log(`[SUCCESS] Email: ${email}`);
      return email;
    } catch (error) {
      console.error(`[ERROR] Gagal buat email: ${error.message}`);
      throw error;
    }
  }
  async checkMessages(email) {
    try {
      console.log(`Proses: Mengecek pesan untuk ${email}...`);
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (!content) return null;
      const match = content.match(/Your verification code is:\r\n\r\n(\d+)/);
      if (!match) return null;
      const code = match[1];
      console.log(`[SUCCESS] Kode verifikasi: ${code}`);
      return code;
    } catch (error) {
      console.error(`[ERROR] Gagal cek pesan: ${error.message}`);
      return null;
    }
  }
  async createPaste(title, content) {
    try {
      console.log(`Proses: Membuat paste: ${title}`);
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "create",
          title: title,
          content: content
        }
      });
      const key = response.data?.key;
      if (!key) throw new Error("Key paste tidak ada");
      console.log(`[SUCCESS] Paste key: ${key}`);
      return key;
    } catch (error) {
      console.error(`[ERROR] Gagal buat paste: ${error.message}`);
      throw error;
    }
  }
  async getPaste(key) {
    try {
      console.log(`Proses: Mengambil paste: ${key}`);
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "get",
          key: key
        }
      });
      const content = response.data?.content;
      if (!content) throw new Error("Paste kosong");
      console.log("[SUCCESS] Paste berhasil diambil");
      return content;
    } catch (error) {
      console.warn(`[WARN] Paste ${key} tidak ditemukan`);
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
      console.error(`[ERROR] Gagal list paste: ${error.message}`);
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
      return !!response.data;
    } catch (error) {
      console.error(`[ERROR] Gagal hapus paste: ${error.message}`);
      return false;
    }
  }
}
class NanoBananaAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.baseURL = "https://nanobanana.ai/api";
    this.csrfToken = null;
    this.csrfExpiry = 0;
    const commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.cookieJar,
      withCredentials: true,
      timeout: 2e4,
      headers: {
        ...commonHeaders,
        "content-type": "application/json"
      }
    }));
    this.api.interceptors.request.use(async config => {
      await sleep(800 + Math.random() * 700);
      if (config.url.includes("/auth/")) {
        config.headers.referer = "https://nanobanana.ai/auth/signin";
        config.headers.origin = "https://nanobanana.ai";
      } else {
        config.headers.referer = "https://nanobanana.ai/generator";
        config.headers.origin = "https://nanobanana.ai";
      }
      if (config.method === "post" && !config.url.includes("/callback/email-code")) {
        config.data = {
          ...config.data,
          csrfToken: await this.getCsrfToken()
        };
      }
      return config;
    });
    this.api.interceptors.response.use(res => res, async error => {
      const status = error.response?.status;
      const retryCount = error.config?.retryCount || 0;
      if ((status === 429 || status >= 500) && retryCount < 3) {
        const delay = 2e3 * (retryCount + 1);
        console.warn(`[RETRY #${retryCount + 1}] setelah ${delay}ms (status: ${status})`);
        await sleep(delay);
        error.config.retryCount = retryCount + 1;
        return this.api(error.config);
      }
      return Promise.reject(error);
    });
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12) + Date.now().toString(36).slice(-4);
  }
  async getCsrfToken(force = false) {
    const now = Date.now();
    if (!force && this.csrfToken && now < this.csrfExpiry) return this.csrfToken;
    try {
      console.log("Proses: Mengambil CSRF dari /auth/csrf...");
      const res = await this.api.get("/auth/csrf");
      const token = res.data?.csrfToken;
      if (!token) throw new Error("csrfToken tidak ada di response");
      this.csrfToken = token;
      this.csrfExpiry = now + 5 * 60 * 1e3;
      console.log(`[SUCCESS] CSRF: ${token.substring(0, 16)}... (valid 5 menit)`);
      return token;
    } catch (error) {
      console.error(`[ERROR] Gagal ambil CSRF: ${error.message}`);
      throw error;
    }
  }
  async getSessionToken() {
    const cookies = await this.cookieJar.getCookies("https://nanobanana.ai");
    return cookies.find(c => c.key === "__Secure-next-auth.session-token")?.value || null;
  }
  async _uploadImage(buffer, fileName = null) {
    fileName = fileName || `img-${Date.now()}-${this._random()}.jpg`;
    try {
      console.log(`Proses: Upload gambar (${(buffer.length / 1024).toFixed(1)} KB)...`);
      const payload = {
        fileName: fileName,
        contentType: "image/jpeg",
        fileSize: buffer.length
      };
      const res = await this.api.post("/get-upload-url", payload);
      const {
        uploadUrl,
        publicUrl
      } = res.data;
      if (!uploadUrl || !publicUrl) throw new Error("Upload URL tidak ada");
      await axios.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      console.log(`[SUCCESS] Upload: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error(`[ERROR] Upload gagal: ${error.message}`);
      throw error;
    }
  }
  async _performRegistration() {
    console.log("\n====== REGISTRASI NANOBANANA ======");
    const email = await this.wudysoft.createEmail();
    await this.api.post("/auth/send-code", {
      email: email,
      locale: "en"
    });
    console.log("Proses: Menunggu kode verifikasi...");
    let code = null;
    for (let i = 0; i < 60; i++) {
      code = await this.wudysoft.checkMessages(email);
      if (code) break;
      console.log(`Menunggu kode... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!code) throw new Error("Timeout: Kode verifikasi tidak diterima");
    const csrfToken = await this.getCsrfToken(true);
    const form = new URLSearchParams({
      email: email,
      code: code,
      redirect: "false",
      callbackUrl: "/en",
      csrfToken: csrfToken,
      json: "true"
    });
    const verifyRes = await this.api.post("/auth/callback/email-code", form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    if (!verifyRes.data?.url) throw new Error("Verifikasi gagal: url tidak ada");
    await this.api.get("/auth/session");
    const sessionToken = await this.getSessionToken();
    if (!sessionToken) throw new Error("Session token hilang setelah login");
    console.log("[SUCCESS] Registrasi & login sukses!");
    return {
      email: email,
      sessionToken: sessionToken
    };
  }
  async _ensureValidSession({
    key
  } = {}) {
    let sessionData = null;
    let currentKey = key;
    if (key) {
      try {
        console.log(`Proses: Memuat sesi dari key: ${key}`);
        const saved = await this.wudysoft.getPaste(key);
        if (saved) {
          sessionData = JSON.parse(saved);
          await this.cookieJar.setCookie(`__Secure-next-auth.session-token=${sessionData.sessionToken}; Domain=.nanobanana.ai; Path=/; Secure; HttpOnly; SameSite=Lax`, "https://nanobanana.ai");
          console.log("[SUCCESS] Sesi dimuat dari key");
        }
      } catch (e) {
        console.warn(`[WARN] Gagal load sesi: ${e.message}`);
      }
    }
    if (!sessionData || !await this.getSessionToken()) {
      console.log("Proses: Buat sesi baru...");
      const newSession = await this._performRegistration();
      const toSave = JSON.stringify({
        sessionToken: newSession.sessionToken,
        email: newSession.email
      });
      currentKey = await this.wudysoft.createPaste(`nanobanana-session-${this._random()}`, toSave);
      sessionData = newSession;
      console.log(`[SUCCESS] Sesi baru: ${currentKey}`);
    }
    await this.getCsrfToken(true);
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru...");
      const {
        key,
        sessionData
      } = await this._ensureValidSession({});
      console.log(`-> Sesi berhasil. Key: ${key}`);
      return {
        key: key,
        email: sessionData.email
      };
    } catch (error) {
      console.error(`[ERROR] Registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async credits({
    key
  } = {}) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mengecek kredit...");
      const res = await this.api.get("/user/credits");
      console.log(`[SUCCESS] Kredit: ${res.data.credits}/${res.data.totalCredits}`);
      return {
        ...res.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] Gagal cek kredit: ${error.message}`);
      throw error;
    }
  }
  async txt2img({
    key,
    prompt,
    ...rest
  }) {
    if (!prompt) throw new Error("prompt wajib");
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: txt2img → "${prompt.substring(0, 50)}..."`);
      const payload = {
        prompt: prompt,
        styleId: "realistic",
        mode: "text",
        imageSize: "auto",
        quality: "standard",
        numImages: 1,
        outputFormat: "png",
        model: "nano-banana",
        resolution: "1024*1024",
        aspectRatio: "1:1",
        ...rest
      };
      const res = await this.api.post("/generate-image", payload);
      if (!res.data.taskId) throw new Error("taskId tidak ada");
      console.log(`[SUCCESS] Task ID: ${res.data.taskId}`);
      return {
        ...res.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] txt2img gagal: ${error.message}`);
      throw error;
    }
  }
  async img2img({
    key,
    prompt = "",
    imageUrl,
    ...rest
  }) {
    if (!imageUrl) throw new Error("imageUrl wajib");
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      const uploaded = [];
      for (const [i, url] of urls.entries()) {
        console.log(`Proses: Upload gambar ${i + 1}/${urls.length}...`);
        let buffer;
        if (Buffer.isBuffer(url)) {
          buffer = url;
        } else if (url.startsWith("http")) {
          const res = await axios.get(url, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
        } else if (url.startsWith("data:image/")) {
          buffer = Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
        } else {
          throw new Error("Format gambar tidak didukung");
        }
        const uploadedUrl = await this._uploadImage(buffer);
        uploaded.push(uploadedUrl);
      }
      console.log(`Proses: img2img → "${prompt.substring(0, 40)}..."`);
      const payload = {
        prompt: prompt,
        styleId: "realistic",
        mode: "image",
        imageUrl: uploaded[0],
        imageUrls: uploaded,
        imageSize: "auto",
        quality: "standard",
        numImages: 1,
        outputFormat: "png",
        model: "nano-banana",
        resolution: "1024*1024",
        aspectRatio: "1:1",
        ...rest
      };
      const res = await this.api.post("/generate-image", payload);
      if (!res.data.taskId) throw new Error("taskId tidak ada");
      console.log(`[SUCCESS] Task ID: ${res.data.taskId}`);
      return {
        ...res.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] img2img gagal: ${error.message}`);
      throw error;
    }
  }
  async status({
    key,
    taskId
  }) {
    if (!taskId) throw new Error("taskId wajib");
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Cek status task ${taskId}...`);
      const res = await this.api.get("/generate-image/status", {
        params: {
          taskId: taskId
        }
      });
      console.log(`[SUCCESS] Status: ${res.data.status}`);
      return {
        ...res.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] Status gagal: ${error.message}`);
      throw error;
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar kunci...");
      const pastes = await this.wudysoft.listPastes();
      return pastes.filter(p => p.title?.startsWith("nanobanana-session-")).map(p => p.key);
    } catch (error) {
      console.error(`[ERROR] Gagal list key: ${error.message}`);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) throw new Error("key wajib");
    try {
      console.log(`Proses: Menghapus kunci ${key}...`);
      const success = await this.wudysoft.delPaste(key);
      console.log(success ? `[SUCCESS] Kunci ${key} dihapus` : `[ERROR] Gagal hapus kunci`);
      return success;
    } catch (error) {
      console.error(`[ERROR] Hapus kunci gagal: ${error.message}`);
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
  const api = new NanoBananaAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "credits":
        response = await api.credits(params);
        break;
      case "txt2img":
        if (!params.prompt) return res.status(400).json({
          error: "Paramenter 'prompt' wajib."
        });
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) return res.status(400).json({
          error: "Paramenter 'imageUrl' wajib."
        });
        response = await api.img2img(params);
        break;
      case "status":
        if (!params.taskId) return res.status(400).json({
          error: "Paramenter 'taskId' wajib."
        });
        response = await api.status(params);
        break;
      case "list_key":
        response = await api.list_key();
        break;
      case "del_key":
        if (!params.key) return res.status(400).json({
          error: "Paramenter 'key' wajib."
        });
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: register, credits, txt2img, img2img, status, list_key, del_key`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}' gagal:`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}