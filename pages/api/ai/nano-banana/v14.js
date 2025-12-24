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
import PROMPT from "@/configs/ai-prompt";
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
      const location = response.headers.location || response.headers.Location;
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
  async checkMessagesBananaAi(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/(https:\/\/banana-ai\.art\/auth\/confirm\?token_hash=[a-zA-Z0-9]+&type=email)/);
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
class BananaAIAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://banana-ai.art/api",
        signup: "/auth/signup",
        generate: "/generate/kie",
        status: taskId => `/generate/kie/status/${taskId}`,
        uploads: "/uploads"
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://banana-ai.art",
      referer: "https://banana-ai.art/",
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
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI BANANA-AI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const password = `${this._random()}A1!`;
    const signupPayload = {
      email: email,
      password: password
    };
    await this.api.post(this.config.endpoints.signup, signupPayload, {
      headers: {
        "content-type": "application/json"
      }
    });
    console.log("Proses: Pendaftaran dikirim, menunggu link verifikasi email...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesBananaAi(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu email verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) {
      throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    }
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    const redirectClient = wrapper(axios.create({
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
    console.log("\n====== MENGIKUTI REDIRECT CHAIN VERIFIKASI ======");
    await followRedirects(redirectClient, verificationLink, browserHeaders, 10);
    console.log("\n====== EKSTRAKSI TOKEN SETELAH VERIFIKASI ======");
    await logCookies(this.cookieJar, "https://banana-ai.art", "FINAL");
    const cookies = await this.cookieJar.getCookies("https://banana-ai.art");
    const authCookie = cookies.find(c => c.key.startsWith("sb-") && c.key.endsWith("-auth-token"));
    if (!authCookie?.value) {
      throw new Error("Gagal mengekstrak cookie otentikasi setelah verifikasi email.");
    }
    try {
      const decodedValue = Buffer.from(authCookie.value.replace("base64-", ""), "base64").toString();
      const sessionData = JSON.parse(decodedValue);
      if (!sessionData.access_token) {
        throw new Error("access_token tidak ditemukan di dalam cookie.");
      }
      console.log("\n[SUCCESS] Sesi berhasil diekstrak dari cookie!");
      console.log(`[TOKEN] ${sessionData.access_token.substring(0, 50)}...`);
      console.log("\n====== REGISTRASI SELESAI ======\n");
      return sessionData;
    } catch (e) {
      console.error("\n[ERROR] Gagal mem-parse cookie otentikasi:", e.message);
      throw new Error("Gagal mem-parse cookie otentikasi.");
    }
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru untuk Banana-AI...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `banana-ai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.access_token) throw new Error("Token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
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
      const newSession = await this.register();
      if (!newSession?.key) throw new Error("Gagal mendaftarkan sesi baru.");
      currentKey = newSession.key;
      sessionData = await this._getTokenFromKey(currentKey);
    }
    const authCookieValue = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
    const cookieString = `sb-xfzbkvukvguulwzcthiz-auth-token=${authCookieValue}; Path=/; Domain=.banana-ai.art; Secure; SameSite=Lax`;
    await this.cookieJar.setCookie(cookieString, "https://banana-ai.art");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async _uploadImage(imageBuffer) {
    try {
      console.log("Proses: Mengunggah gambar ke Banana-AI...");
      const formData = new FormData();
      formData.append("file", imageBuffer, {
        filename: `${this._random()}.png`,
        contentType: "image/png"
      });
      const response = await this.api.post(this.config.endpoints.uploads, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      const imageUrl = response.data?.url;
      if (!imageUrl) {
        throw new Error("Gagal mendapatkan URL gambar setelah unggah.");
      }
      console.log("Proses: Gambar berhasil diunggah.", imageUrl);
      return imageUrl;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses unggah gambar gagal: ${errorMessage}`);
      throw error;
    }
  }
  async generate({
    key,
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Membuat gambar dari gambar (generate)...");
      const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      if (images.length === 0) throw new Error("Setidaknya satu URL gambar diperlukan.");
      const uploadedImageUrls = [];
      for (const url of images) {
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
        const uploadedUrl = await this._uploadImage(imageBuffer);
        uploadedImageUrls.push(uploadedUrl);
      }
      const payload = {
        prompt: prompt,
        type: "image_to_image",
        inputImages: uploadedImageUrls,
        ...rest
      };
      const response = await this.api.post(this.config.endpoints.generate, payload, {
        headers: {
          "content-type": "application/json"
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
  async status({
    key,
    task_id
  }) {
    try {
      if (!key) throw new Error("Kunci (key) diperlukan untuk mengecek status.");
      const sessionData = await this._getTokenFromKey(key);
      const authCookieValue = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
      const cookieString = `sb-xfzbkvukvguulwzcthiz-auth-token=${authCookieValue}; Path=/; Domain=.banana-ai.art; Secure; SameSite=Lax`;
      await this.cookieJar.setCookie(cookieString, "https://banana-ai.art");
      console.log(`Proses: Mengecek status untuk task_id ${task_id} menggunakan kunci ${key}...`);
      const response = await this.api.get(this.config.endpoints.status(task_id));
      console.log("Proses: Status berhasil didapatkan.");
      return {
        ...response.data,
        key: key
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pengecekan status gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("banana-ai-session-")).map(paste => paste.key);
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new BananaAIAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "generate":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter dan 'imageUrl' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.key || !params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'key' dan 'task_id' wajib diisi untuk action 'status'."
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'generate', 'list_key', 'del_key' dan 'status'.`
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