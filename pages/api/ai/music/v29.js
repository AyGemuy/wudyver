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
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createEmail': ${error.message}`);
      throw error;
    }
  }
  async checkMessagesDeepsong(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/https:\/\/deepsong\.ai\/api\/auth\/magic-link\/verify\?token=[a-zA-Z0-9]+&callbackURL=\//);
        return match ? match[0] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesDeepsong' untuk email ${email}: ${error.message}`);
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
class DeepSongAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://deepsong.ai",
      referer: "https://deepsong.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: "https://deepsong.ai/api",
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
      if (!sessionData.session_token || !sessionData.session_data) throw new Error("Data sesi tidak valid dalam data tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI DEEPSONG ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    await this.api.post("/auth/sign-in/magic-link", {
      email: email,
      callbackURL: "/"
    });
    console.log("Proses: Magic link telah diminta, menunggu email masuk...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesDeepsong(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    await this.api.get(verificationLink, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "upgrade-insecure-requests": "1"
      }
    });
    console.log("Proses: Link verifikasi telah dikunjungi, mengekstrak cookie...");
    const cookies = await this.cookieJar.getCookies("https://deepsong.ai/");
    const sessionTokenCookie = cookies.find(c => c.key === "__Secure-better-auth.session_token");
    const sessionDataCookie = cookies.find(c => c.key === "__Secure-better-auth.session_data");
    if (!sessionTokenCookie?.value || !sessionDataCookie?.value) {
      throw new Error("Gagal mengekstrak cookie sesi setelah verifikasi.");
    }
    const sessionData = {
      session_token: sessionTokenCookie.value,
      session_data: sessionDataCookie.value
    };
    console.log("\n[SUCCESS] Sesi DeepSong berhasil diekstrak!");
    console.log("\n====== REGISTRASI SELESAI ======\n");
    return sessionData;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru untuk DeepSong...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `deepsong-session-${this._random()}`;
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
    await this.cookieJar.setCookie(`__Secure-better-auth.session_token=${sessionData.session_token}`, "https://deepsong.ai/");
    await this.cookieJar.setCookie(`__Secure-better-auth.session_data=${sessionData.session_data}`, "https://deepsong.ai/");
    const sessionInfo = await this.api.get("/auth/get-session");
    if (!sessionInfo.data?.user?.id) {
      console.error("Sesi yang ada tidak valid. Mencoba mendaftar ulang...");
      const newSession = await this.register();
      currentKey = newSession.key;
      sessionData = await this._getSessionFromKey(currentKey);
      await this.cookieJar.setCookie(`__Secure-better-auth.session_token=${sessionData.session_token}`, "https://deepsong.ai/");
      await this.cookieJar.setCookie(`__Secure-better-auth.session_data=${sessionData.session_data}`, "https://deepsong.ai/");
      const finalSessionInfo = await this.api.get("/auth/get-session");
      if (!finalSessionInfo.data?.user?.id) {
        throw new Error("Gagal mendapatkan sesi yang valid bahkan setelah mendaftar ulang.");
      }
      return {
        key: currentKey,
        session: finalSessionInfo.data
      };
    }
    return {
      key: currentKey,
      session: sessionInfo.data
    };
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
      console.log("Proses: Mengecek informasi kredit...");
      const response = await this.api.get("/credits/get-user-credit");
      console.log("Proses: Informasi kredit berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses cek kredit gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async generate({
    key,
    prompt,
    style,
    title,
    model = "V3_5",
    ...rest
  }) {
    try {
      const {
        key: currentKey,
        session
      } = await this._ensureValidSession({
        key: key
      });
      const userId = session.user.id;
      console.log(`Proses: Membuat lagu dengan user ID ${userId}...`);
      const params = new URLSearchParams({
        userId: userId,
        private: false,
        prompt: prompt,
        customMode: true,
        instrumental: false,
        style: style || "Pop",
        title: title || "Untitled Song",
        model: model,
        callBackUrl: "https://deepsong.ai/api/dashboard/user-song/song-generation-callback",
        ...rest
      });
      const response = await this.api.post(`/ai/kie-ai/generate-song?${params.toString()}`);
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
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk task_id ${task_id}...`);
      const response = await this.api.post(`/ai/kie-ai/get-song-details?taskId=${task_id}`);
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
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi DeepSong...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("deepsong-session-")).map(paste => paste.key);
    } catch (error) {
      console.error("Gagal mengambil daftar kunci:", error.message);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) throw new Error("Kunci tidak disediakan untuk dihapus.");
    try {
      console.log(`Proses: Mencoba menghapus kunci: ${key}`);
      const success = await this.wudysoft.delPaste(key);
      console.log(success ? `Kunci ${key} berhasil dihapus.` : `Gagal menghapus kunci ${key}.`);
      return {
        success: success
      };
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
  const api = new DeepSongAPI();
  try {
    let response;
    const validActions = ["register", "credit", "generate", "status", "list_key", "del_key"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: `Action tidak valid: ${action}. Action yang didukung: ${validActions.join(", ")}.`
      });
    }
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "credit":
        if (!params.key) return res.status(400).json({
          error: "Paramenter 'key' wajib diisi."
        });
        response = await api.credit(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.key || !params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'key' dan 'task_id' wajib diisi."
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
            error: "Paramenter 'key' wajib diisi."
          });
        }
        response = await api.del_key(params);
        break;
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}