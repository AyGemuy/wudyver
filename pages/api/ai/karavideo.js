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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function base64URLEncode(str) {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest();
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
      console.error(`[ERROR] Gagal membuat email: ${error.message}`);
      throw error;
    }
  }
  async checkMessagesKaravideo(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/https:\/\/track\.karavideo\.ai\/track\/click2\/[a-zA-Z0-9.\-_=]+\.html/);
        return match ? match[0] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal cek email ${email}: ${error.message}`);
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
      console.error(`[ERROR] Gagal membuat paste: ${error.message}`);
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
      console.error(`[ERROR] Gagal ambil paste ${key}: ${error.message}`);
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
      return response.data || null;
    } catch (error) {
      console.error(`[ERROR] Gagal hapus paste ${key}: ${error.message}`);
      return false;
    }
  }
}
class KaravideoAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdXVnYWJod2F6cXRka2t0dWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNjIyNjMsImV4cCI6MjA1NzgzODI2M30.aeDsu-rGFNw59-gW9hQVBdtzgaxKH9FHixGbdLWX7XY";
    this.config = {
      endpoints: {
        base: "https://karavideo.ai/app/api",
        supabase: "https://api.karavideo.ai/auth/v1",
        supabaseRest: "https://api.karavideo.ai/rest/v1",
        signup: "/signup",
        token: "/token",
        txt2vid: "/text_2_video",
        img2vid: "/image_2_video",
        tmp2vid: "/template-to-video",
        subscription: "/user/fetch-subscription",
        taskStatus: "/video_generation_task_statuses"
      },
      supabaseKey: supabaseKey
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://karavideo.ai",
      referer: "https://karavideo.ai/",
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
        "cache-control": "no-cache",
        pragma: "no-cache",
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
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
        "x-supabase-api-version": "2024-01-01"
      }
    }));
    this.supabaseRestApi = wrapper(axios.create({
      baseURL: this.config.endpoints.supabaseRest,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "application/vnd.pgrst.object+json",
        "accept-profile": "public",
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient"
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
      if (!sessionData.access_token) throw new Error("Token tidak valid.");
      if (sessionData.expires_at) {
        const now = Math.floor(Date.now() / 1e3);
        if (now >= sessionData.expires_at) {
          console.warn("Token telah expired, perlu login ulang.");
          throw new Error("Token expired, silakan login ulang.");
        }
      }
      console.log("Proses: Sesi berhasil dimuat.");
      console.log(`[EMAIL] ${sessionData.email || sessionData.user?.email || "Unknown"}`);
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI KARAVIDEO ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const {
      verifier,
      challenge
    } = this._generatePKCE();
    const verifierCookieValue = `base64-${Buffer.from(JSON.stringify(verifier)).toString("base64")}`;
    await this.cookieJar.setCookie(`sb-api-auth-token-code-verifier=${verifierCookieValue}; Path=/; Secure; SameSite=Lax`, "https://karavideo.ai");
    console.log("Proses: PKCE verifier cookie telah diatur.");
    const password = email;
    const signupPayload = {
      email: email,
      password: password,
      data: {},
      gotrue_meta_security: {},
      code_challenge: challenge,
      code_challenge_method: "s256"
    };
    const redirectUrl = "https://karavideo.ai/app/auth/confirm?type=email&source=activation";
    await this.supabaseApi.post(`/signup?redirect_to=${encodeURIComponent(redirectUrl)}`, signupPayload);
    console.log("Proses: Pendaftaran berhasil, mencari link verifikasi...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesKaravideo(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) {
      throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    }
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    const redirectClient = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      maxRedirects: 10
    }));
    await redirectClient.get(verificationLink, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("\n====== EKSTRAKSI TOKEN ======");
    const karavideoCookies = await this.cookieJar.getCookies("https://karavideo.ai");
    const authCookie = karavideoCookies.find(cookie => cookie.key === "sb-api-auth-token");
    if (!authCookie?.value) {
      throw new Error("Gagal mengekstrak cookie auth-token.");
    }
    try {
      const decodedValue = Buffer.from(authCookie.value.replace("base64-", ""), "base64").toString();
      const sessionData = JSON.parse(decodedValue);
      if (!sessionData.access_token) {
        throw new Error("access_token tidak ditemukan.");
      }
      console.log("\n[SUCCESS] Sesi berhasil diekstrak!");
      console.log(`[EMAIL] ${email}`);
      console.log(`[TOKEN] ${sessionData.access_token.substring(0, 50)}...`);
      console.log(`[USER_ID] ${sessionData.user?.id || "Unknown"}`);
      console.log("\n====== REGISTRASI SELESAI ======\n");
      return {
        access_token: sessionData.access_token,
        token_type: sessionData.token_type || "bearer",
        expires_in: sessionData.expires_in || 3600,
        expires_at: sessionData.expires_at || Math.floor(Date.now() / 1e3) + 3600,
        refresh_token: sessionData.refresh_token,
        user: sessionData.user,
        email: email,
        password: password
      };
    } catch (e) {
      console.error("\n[ERROR] Gagal mem-parse cookie auth:", e.message);
      throw new Error("Gagal mem-parse cookie auth-token.");
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
      console.log("Proses: Mendaftarkan sesi baru...");
      const newSession = await this.register();
      if (!newSession?.key) throw new Error("Gagal mendaftarkan sesi baru.");
      console.log(`-> PENTING: Simpan kunci baru ini: ${newSession.key}`);
      currentKey = newSession.key;
      sessionData = await this._getTokenFromKey(currentKey);
    }
    const cookieValue = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
    await this.cookieJar.setCookie(`sb-api-auth-token=${cookieValue}; Domain=.karavideo.ai; Path=/; Secure; SameSite=Lax`, "https://karavideo.ai");
    if (sessionData.access_token) {
      this.supabaseRestApi.defaults.headers.authorization = `Bearer ${sessionData.access_token}`;
    }
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        access_token: sessionData.access_token,
        token_type: sessionData.token_type,
        expires_in: sessionData.expires_in,
        expires_at: sessionData.expires_at,
        refresh_token: sessionData.refresh_token,
        user: sessionData.user,
        email: sessionData.email,
        password: sessionData.password
      });
      const sessionTitle = `karavideo-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        access_token: sessionData.access_token,
        token_type: sessionData.token_type,
        expires_in: sessionData.expires_in,
        expires_at: sessionData.expires_at,
        refresh_token: sessionData.refresh_token,
        user: sessionData.user,
        email: sessionData.email,
        password: sessionData.password
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
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
        gotrue_meta_security: {}
      };
      const response = await this.supabaseApi.post("/token?grant_type=password", loginPayload);
      const sessionData = response.data;
      if (!sessionData.access_token) {
        throw new Error("Gagal mendapatkan access token dari login.");
      }
      console.log("Proses: Login berhasil.");
      console.log(`[USER] ${sessionData.user?.email || email}`);
      console.log(`[TOKEN] ${sessionData.access_token.substring(0, 50)}...`);
      const sessionToSave = JSON.stringify({
        access_token: sessionData.access_token,
        token_type: sessionData.token_type,
        expires_in: sessionData.expires_in,
        expires_at: sessionData.expires_at,
        refresh_token: sessionData.refresh_token,
        user: sessionData.user,
        email: email,
        password: password
      });
      const sessionTitle = `karavideo-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi login.");
      console.log(`-> Sesi login berhasil disimpan. Kunci Anda: ${newKey}`);
      const cookieValue = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
      await this.cookieJar.setCookie(`sb-api-auth-token=${cookieValue}; Domain=.karavideo.ai; Path=/; Secure; SameSite=Lax`, "https://karavideo.ai");
      return {
        key: newKey,
        access_token: sessionData.access_token,
        token_type: sessionData.token_type,
        expires_in: sessionData.expires_in,
        expires_at: sessionData.expires_at,
        refresh_token: sessionData.refresh_token,
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
  async txt2vid({
    key,
    prompt,
    model = "sora",
    negative_prompt = "",
    aspect_ratio = "9:16",
    cfg = .5,
    seed = "",
    quality = "normal",
    duration = "15s",
    number_of_videos = 1,
    is_published = true,
    resolution = "512",
    loop = false
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dari teks dengan model ${model}...`);
      const payload = {
        prompt: prompt,
        model: model,
        negative_prompt: negative_prompt,
        aspect_ratio: aspect_ratio,
        cfg: cfg,
        seed: seed,
        quality: quality,
        duration: duration,
        number_of_videos: number_of_videos,
        is_published: is_published,
        resolution: resolution,
        loop: loop
      };
      const response = await this.api.post(this.config.endpoints.txt2vid, payload);
      console.log("Proses: Tugas txt2vid berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2vid gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2vid({
    key,
    prompt,
    imageUrl,
    model = "sora",
    negative_prompt = "",
    aspect_ratio = "16:9",
    quality = "normal",
    duration = "10s",
    number_of_videos = 1,
    is_published = true
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dari gambar dengan model ${model}...`);
      let imageBuffer;
      if (Buffer.isBuffer(imageUrl)) {
        imageBuffer = imageUrl;
      } else if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
      } else {
        imageBuffer = Buffer.from(imageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("model", model);
      form.append("negative_prompt", negative_prompt);
      form.append("image0", imageBuffer, "image.png");
      form.append("aspect_ratio", aspect_ratio);
      form.append("quality", quality);
      form.append("duration", duration);
      form.append("is_published", is_published.toString());
      form.append("number_of_videos", number_of_videos.toString());
      const response = await this.api.post(this.config.endpoints.img2vid, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Tugas img2vid berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses img2vid gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async tmp2vid({
    key,
    prompt,
    imageUrl,
    template,
    model = "vidu1.5",
    negative_prompt = "",
    duration = "4s",
    number_of_videos = 1,
    is_published = true
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dari template ${template}...`);
      let imageBuffer;
      if (Buffer.isBuffer(imageUrl)) {
        imageBuffer = imageUrl;
      } else if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
      } else {
        imageBuffer = Buffer.from(imageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("model", model);
      form.append("negative_prompt", negative_prompt);
      form.append("image0", imageBuffer, "image.jpg");
      form.append("duration", duration);
      form.append("template", template);
      form.append("is_published", is_published.toString());
      form.append("number_of_videos", number_of_videos.toString());
      const response = await this.api.post(this.config.endpoints.tmp2vid, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Tugas tmp2vid berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses tmp2vid gagal: ${errorMessage}`);
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
      const response = await this.supabaseRestApi.get(`${this.config.endpoints.taskStatus}?select=*&task_id=eq.${task_id}`);
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
  async subscription({
    key
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mengambil info subscription...");
      const response = await this.api.get(this.config.endpoints.subscription);
      console.log("Proses: Info subscription berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses subscription gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("karavideo-session-")).map(paste => paste.key);
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
  const api = new KaravideoAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "login":
        if (!params.email || !params.password) {
          return res.status(400).json({
            error: "Parameter 'email' dan 'password' wajib diisi untuk action 'login'."
          });
        }
        response = await api.login(params);
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.imageUrl || !params.prompt) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' dan 'prompt' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
        break;
      case "tmp2vid":
        if (!params.imageUrl || !params.prompt || !params.template) {
          return res.status(400).json({
            error: "Parameter 'imageUrl', 'prompt', dan 'template' wajib diisi untuk action 'tmp2vid'."
          });
        }
        response = await api.tmp2vid(params);
        break;
      case "subscription":
        response = await api.subscription(params);
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
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'txt2vid', 'img2vid', 'tmp2vid', 'subscription', 'list_key', 'del_key', 'status'.`
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