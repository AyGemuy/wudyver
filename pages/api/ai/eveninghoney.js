import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
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
      console.error(`[ERROR] Gagal membuat email: ${error.message}`);
      throw error;
    }
  }
  async checkMessagesEveningHoney(email) {
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
        return match ? match[1] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal cek email: ${error.message}`);
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
      console.error(`[ERROR] Gagal mendapatkan paste: ${error.message}`);
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
      console.error(`[ERROR] Gagal list pastes: ${error.message}`);
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
      console.error(`[ERROR] Gagal hapus paste: ${error.message}`);
      return false;
    }
  }
}
class EveningHoneyAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtseXJmcGltbWNoZ2VodHFvb3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMDk0ODgsImV4cCI6MjA2Mjc4NTQ4OH0.Lwtu17YWnFJ45B9mrjKqDYE_2Q84TwaN_qREWAiR1j0";
    this.config = {
      endpoints: {
        supabase: "https://klyrfpimmchgehtqoozi.supabase.co",
        auth: "https://klyrfpimmchgehtqoozi.supabase.co/auth/v1",
        rest: "https://klyrfpimmchgehtqoozi.supabase.co/rest/v1",
        functions: "https://klyrfpimmchgehtqoozi.supabase.co/functions/v1"
      },
      supabaseKey: supabaseKey
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://www.eveninghoney.ai",
      referer: "https://www.eveninghoney.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.authApi = wrapper(axios.create({
      baseURL: this.config.endpoints.auth,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "*/*",
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        "content-type": "application/json;charset=UTF-8",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "x-client-info": "supabase-js-web/2.49.4",
        "x-supabase-api-version": "2024-01-01"
      }
    }));
    this.restApi = wrapper(axios.create({
      baseURL: this.config.endpoints.rest,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "*/*",
        "accept-profile": "eh",
        apikey: supabaseKey,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "x-client-info": "supabase-js-web/2.49.4"
      }
    }));
    this.functionsApi = wrapper(axios.create({
      baseURL: this.config.endpoints.functions,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...commonHeaders,
        accept: "*/*",
        apikey: supabaseKey,
        "content-type": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "x-client-info": "supabase-js-web/2.49.4"
      }
    }));
    this.wudysoft = new WudysoftAPI();
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
    console.log("\n====== MEMULAI PROSES REGISTRASI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const otpPayload = {
      email: email,
      data: {},
      create_user: true,
      gotrue_meta_security: {},
      code_challenge: null,
      code_challenge_method: null
    };
    await this.authApi.post("/otp?redirect_to=https%3A%2F%2Fwww.eveninghoney.ai%2F", otpPayload);
    console.log("Proses: OTP telah dikirim ke email.");
    let otp = null;
    for (let i = 0; i < 60; i++) {
      otp = await this.wudysoft.checkMessagesEveningHoney(email);
      if (otp) break;
      console.log(`Proses: Menunggu OTP... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!otp) throw new Error("Gagal menemukan OTP setelah 3 menit.");
    console.log(`Proses: OTP ditemukan: ${otp}`);
    const verifyPayload = {
      email: email,
      token: otp,
      type: "email",
      gotrue_meta_security: {}
    };
    const verifyResponse = await this.authApi.post("/verify", verifyPayload);
    const sessionData = verifyResponse.data;
    if (!sessionData.access_token) {
      throw new Error("Gagal mendapatkan access token setelah verifikasi.");
    }
    console.log("\n[SUCCESS] Sesi berhasil dibuat!");
    console.log(`[TOKEN] ${sessionData.access_token.substring(0, 50)}...`);
    console.log("\n====== REGISTRASI SELESAI ======\n");
    return {
      ...sessionData,
      email: email
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        email: sessionData.email,
        user_id: sessionData.user?.id
      });
      const sessionTitle = `eveninghoney-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        user_id: sessionData.user?.id
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
    this.restApi.defaults.headers.authorization = `Bearer ${sessionData.access_token}`;
    this.functionsApi.defaults.headers.authorization = `Bearer ${sessionData.access_token}`;
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async characters({
    key,
    scope = "public"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mengambil daftar karakter...");
      const response = await this.restApi.get("/characters", {
        params: {
          select: "*",
          order: "created_at.desc",
          character_scope: `eq.${scope}`
        }
      });
      console.log(`Proses: Berhasil mengambil ${response.data.length} karakter.`);
      return {
        characters: response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses characters gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async detail({
    key,
    slug
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengambil detail karakter: ${slug}`);
      const response = await this.restApi.get("/characters", {
        params: {
          select: "*,chats!chats_character_id_fkey(id,created_at,deleted_at),settings:settings_id(messaging_mode,nsfw)",
          "chats.deleted_at": "is.null",
          "chats.order": "created_at.desc",
          "chats.limit": 3,
          url_slug: `eq.${slug}`,
          character_scope: "in.(private,public,random)"
        }
      });
      console.log("Proses: Detail karakter berhasil diambil.");
      return {
        character: response.data[0] || null,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses detail gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async chats({
    key,
    userId
  }) {
    try {
      const {
        sessionData,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const targetUserId = userId || sessionData.user_id;
      console.log("Proses: Mengambil daftar chat...");
      const response = await this.restApi.get("/chats", {
        params: {
          select: "id,created_at,chat_metadata,character_id,character:character_id(first_name,last_name,url_slug,avatar_fpath,profile_media_fpaths),messages(id,msg_text,msg_type,created_at)",
          user_id: `eq.${targetUserId}`,
          deleted_at: "is.null",
          "messages.order": "created_at.desc",
          "messages.limit": 1,
          order: "updated_at.desc"
        }
      });
      console.log(`Proses: Berhasil mengambil ${response.data.length} chat.`);
      return {
        chats: response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses chats gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async send({
    key,
    chatId,
    message,
    messageType = "text"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengirim pesan ke chat ${chatId}...`);
      const now = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Makassar",
        timeZoneName: "long"
      };
      const localTime = now.toLocaleString("id-ID", options);
      const payload = {
        chatId: chatId,
        message: message,
        messageType: messageType,
        timeZone: "Asia/Makassar",
        localTime: localTime
      };
      const response = await this.functionsApi.post("/eh-chat-message", payload);
      console.log("Proses: Pesan berhasil dikirim.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses send gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async message({
    key,
    chatId,
    limit = 500
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengambil pesan dari chat ${chatId}...`);
      const response = await this.restApi.get("/messages", {
        params: {
          select: "*",
          chat_id: `eq.${chatId}`,
          order: "created_at.desc",
          limit: limit
        }
      });
      console.log(`Proses: Berhasil mengambil ${response.data.length} pesan.`);
      return {
        messages: response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses message gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("eveninghoney-session-")).map(paste => paste.key);
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
  const api = new EveningHoneyAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "characters":
        response = await api.characters(params);
        break;
      case "detail":
        if (!params.slug) {
          return res.status(400).json({
            error: "Parameter 'slug' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "chats":
        response = await api.chats(params);
        break;
      case "send":
        if (!params.chatId || !params.message) {
          return res.status(400).json({
            error: "Parameter 'chatId' dan 'message' wajib diisi untuk action 'send'."
          });
        }
        response = await api.send(params);
        break;
      case "message":
        if (!params.chatId) {
          return res.status(400).json({
            error: "Parameter 'chatId' wajib diisi untuk action 'message'."
          });
        }
        response = await api.message(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'characters', 'detail', 'chats', 'send', 'message', 'list_key', 'del_key'.`
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