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
import FormData from "form-data";
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
  async checkMessagesZeroedit(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/https:\/\/idgdpxmzjhzrytrbwkrf\.supabase\.co\/auth\/v1\/verify\?token=pkce_[a-zA-Z0-9.\-_]+&type=signup&redirect_to=https:\/\/zeroedit\.me\/auth\/callback/);
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
class ZeroeditAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZ2RweG16amh6cnl0cmJ3a3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODI0MTQsImV4cCI6MjA2Njk1ODQxNH0.VxxM8npnKFe1OHErWBttI3l4qbnLOFGX9_YgzXqRZ7A";
    this.config = {
      endpoints: {
        base: "https://zeroedit.me/api",
        supabase: "https://idgdpxmzjhzrytrbwkrf.supabase.co/auth/v1",
        editImage: "/edit-image",
        credits: "/credits"
      },
      supabaseKey: supabaseKey
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://zeroedit.me",
      referer: "https://zeroedit.me/",
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
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      }
    }));
    this.supabaseApi = wrapper(axios.create({
      baseURL: this.config.endpoints.supabase,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "*/*",
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        "content-type": "application/json;charset=UTF-8",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "x-client-info": "supabase-ssr/0.5.2",
        "x-supabase-api-version": "2024-01-01"
      }
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _generatePKCE() {
    const verifier = base64URLEncode(randomBytes(32));
    const challenge = base64URLEncode(sha256(verifier));
    return {
      verifier: verifier,
      challenge: challenge
    };
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
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
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI ZEROEDIT ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const {
      verifier,
      challenge
    } = this._generatePKCE();
    const verifierCookieValue = `base64-${Buffer.from(JSON.stringify(verifier)).toString("base64")}`;
    await this.cookieJar.setCookie(`sb-idgdpxmzjhzrytrbwkrf-auth-token-code-verifier=${verifierCookieValue}; Path=/; Secure; SameSite=Lax`, "https://zeroedit.me");
    console.log("Proses: PKCE verifier cookie telah diatur.");
    const password = `${this._random()}A1!`;
    const signupPayload = {
      email: email,
      password: password,
      data: {},
      gotrue_meta_security: {},
      code_challenge: challenge,
      code_challenge_method: "s256"
    };
    await this.supabaseApi.post("/signup?redirect_to=https%3A%2F%2Fzeroedit.me%2Fauth%2Fcallback", signupPayload);
    console.log("Proses: Pendaftaran berhasil, mencari link verifikasi...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesZeroedit(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
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
    console.log("\n====== MENGIKUTI REDIRECT CHAIN ======");
    await followRedirects(redirectClient, verificationLink, browserHeaders, 10);
    console.log("\n====== EKSTRAKSI TOKEN ======");
    await logCookies(this.cookieJar, "https://zeroedit.me", "FINAL");
    const zeroeditCookies = await this.cookieJar.getCookies("https://zeroedit.me");
    const authCookie = zeroeditCookies.find(cookie => cookie.key.startsWith("sb-") && cookie.key.endsWith("-auth-token"));
    if (!authCookie?.value) {
      throw new Error("Gagal mengekstrak cookie auth-token setelah semua redirect.");
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
      console.error("\n[ERROR] Gagal mem-parse cookie auth:", e.message);
      throw new Error("Gagal mem-parse cookie auth-token.");
    }
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru Zeroedit...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `zeroedit-session-${this._random()}`;
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
    const cookieValue = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
    await this.cookieJar.setCookie(`sb-idgdpxmzjhzrytrbwkrf-auth-token=${cookieValue}; Domain=.zeroedit.me; Path=/; Secure; SameSite=Lax`, "https://zeroedit.me");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async generate({
    key,
    imageUrl,
    prompt = PROMPT.text
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      let imageBuffer;
      let filename = "image.jpg";
      let contentType = "image/jpeg";
      if (Buffer.isBuffer(imageUrl)) {
        console.log("Proses: Input gambar terdeteksi sebagai Buffer.");
        imageBuffer = imageUrl;
      } else if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        console.log(`Proses: Mengunduh gambar dari URL: ${imageUrl}`);
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
        const headerContentType = response.headers["content-type"];
        if (headerContentType && headerContentType.startsWith("image/")) {
          contentType = headerContentType;
        }
        const contentDisposition = response.headers["content-disposition"];
        let foundFilename = null;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            foundFilename = filenameMatch[1];
          }
        }
        if (foundFilename) {
          filename = foundFilename;
        } else {
          const path = new URL(imageUrl).pathname;
          const lastSegment = path.substring(path.lastIndexOf("/") + 1);
          if (lastSegment) {
            filename = lastSegment;
          } else {
            const extension = contentType.split("/")[1] || "jpg";
            filename = `image.${extension.replace("jpeg", "jpg")}`;
          }
        }
      } else if (typeof imageUrl === "string") {
        console.log("Proses: Input gambar terdeteksi sebagai string Base64.");
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
      } else {
        throw new Error("Format 'imageUrl' tidak valid. Harap berikan URL, Buffer, atau string Base64.");
      }
      console.log(`Proses: Mengirim gambar sebagai ${filename} (${contentType})...`);
      const formData = new FormData();
      formData.append("image0", imageBuffer, {
        filename: filename,
        contentType: contentType
      });
      formData.append("prompt", prompt);
      const response = await this.api.post(this.config.endpoints.editImage, formData, {
        headers: formData.getHeaders()
      });
      console.log("Proses: Permintaan edit gambar berhasil.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses editImage gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async credit({
    key
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mengecek sisa kredit...");
      const response = await this.api.get(this.config.endpoints.credits);
      console.log("Proses: Berhasil mendapatkan info kredit.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses credit gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("zeroedit-session-")).map(paste => paste.key);
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
  const api = new ZeroeditAPI();
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
      case "credit":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'credit'."
          });
        }
        response = await api.credit(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'generate', 'credit', 'list_key', 'del_key'.`
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