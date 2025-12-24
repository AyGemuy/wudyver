import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const wudysoftApiClient = axios.create({
  baseURL: `https://${apiConfig.DOMAIN_URL}/api`
});
class WudysoftAPI {
  constructor() {
    this.client = wudysoftApiClient;
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
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
  async createEmail() {
    try {
      console.log("Proses: Membuat email sementara...");
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      const email = response.data?.email;
      if (!email) throw new Error("Gagal mendapatkan email dari respons API.");
      console.log(`Proses: Email berhasil dibuat -> ${email}`);
      return email;
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
        const match = content.match(/One-time password:\s*(\d{6})/);
        return match?.[1] || null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessages' untuk email ${email}: ${error.message}`);
      return null;
    }
  }
}
class AiVideoMakerAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://aivideomaker.ai/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://aivideomaker.ai",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  async _getSessionFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci paste: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) {
      throw new Error(`Sesi dengan kunci paste "${key}" tidak ditemukan.`);
    }
    try {
      const sessionData = JSON.parse(savedSession);
      const session = sessionData.auth_session;
      if (!session) throw new Error("auth_session tidak valid di sesi yang tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return session;
    } catch (e) {
      throw new Error(`Gagal memuat sesi dari kunci paste "${key}": ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("Proses: Memulai registrasi akun baru di aivideomaker.ai...");
    const email = await this.wudysoft.createEmail();
    const password = `${this._random()}aA1!`;
    console.log(`Proses: Mengirim permintaan signup untuk ${email}...`);
    await this.api.post("/auth.signup?batch=1", {
      0: {
        json: {
          email: email,
          password: password,
          callbackUrl: "https://aivideomaker.ai/auth/verify"
        }
      }
    });
    console.log("Proses: Permintaan signup berhasil, memulai polling untuk OTP...");
    let otp = null;
    for (let i = 0; i < 60; i++) {
      otp = await this.wudysoft.checkMessages(email);
      if (otp) break;
      console.log(`Proses: Belum ada OTP, menunggu 5 detik... (${i + 1}/20)`);
      await sleep(3e3);
    }
    if (!otp) throw new Error("Gagal menemukan OTP setelah 100 detik.");
    console.log(`Proses: OTP ditemukan -> ${otp}`);
    console.log("Proses: Memverifikasi OTP...");
    const verifyResponse = await this.api.post("/auth.verifyOtp?batch=1", {
      0: {
        json: {
          code: otp,
          type: "SIGNUP",
          identifier: email
        }
      }
    });
    const setCookieHeader = verifyResponse.headers["set-cookie"];
    const sessionCookie = setCookieHeader?.find(c => c.startsWith("auth_session="));
    const authSession = sessionCookie?.split(";")[0]?.split("=")[1] || null;
    if (!authSession) throw new Error("Gagal mendapatkan 'auth_session' setelah verifikasi.");
    console.log("Proses: Aktivasi akun berhasil. Session didapatkan.");
    return authSession;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru dan menyimpannya...");
      const authSession = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        auth_session: authSession
      });
      const sessionTitle = `aivideomaker-key-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru ke Wudysoft Paste.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Paste Anda: ${newKey}`);
      return {
        key: newKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`Proses registrasi gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async _ensureValidSession({
    key
  }) {
    if (key) {
      try {
        const session = await this._getSessionFromKey(key);
        return {
          session: session,
          key: key
        };
      } catch (error) {
        console.warn(`[PERINGATAN] ${error.message}. Mendaftarkan sesi baru secara otomatis...`);
      }
    } else {
      console.log("Proses: Kunci paste tidak disediakan, mendaftarkan sesi baru...");
    }
    const newSessionData = await this.register();
    if (!newSessionData?.key) {
      throw new Error("Gagal mendaftarkan sesi baru secara otomatis.");
    }
    console.log(`-> PENTING: Simpan kunci paste baru ini untuk penggunaan selanjutnya: ${newSessionData.key}`);
    const newSession = await this._getSessionFromKey(newSessionData.key);
    return {
      session: newSession,
      key: newSessionData.key
    };
  }
  async _getCfToken() {
    try {
      console.log("Proses: Mendapatkan token Cloudflare...");
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token?url=https://aivideomaker.ai/&sitekey=0x4AAAAAABrddy3Hsje8mwB_`);
      const token = response.data?.token;
      if (!token) throw new Error("Token tidak ditemukan di respons.");
      console.log("Proses: Token Cloudflare berhasil didapatkan.");
      return token;
    } catch (error) {
      console.error(`[ERROR] Gagal mendapatkan token Cloudflare: ${error.message}`);
      throw error;
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("aivideomaker-key-")).map(paste => paste.key);
    } catch (error) {
      console.error("Gagal mengambil daftar kunci:", error.message);
      throw error;
    }
  }
  async del_key({
    key
  }) {
    if (!key) throw new Error("Paramenter 'key' wajib diisi untuk menghapus.");
    try {
      console.log(`Proses: Mencoba menghapus kunci paste: ${key}`);
      const success = await this.wudysoft.delPaste(key);
      console.log(success ? `Kunci ${key} berhasil dihapus.` : `Gagal menghapus kunci ${key}.`);
      return success;
    } catch (error) {
      console.error(`Terjadi error saat menghapus kunci ${key}:`, error.message);
      throw error;
    }
  }
  async txt2vid({
    key,
    prompt,
    ...rest
  }) {
    try {
      const {
        session,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const cfToken = await this._getCfToken();
      console.log("Proses: Membuat video dari teks...");
      const payload = {
        0: {
          json: {
            token: cfToken,
            content: prompt,
            aspectRatio: rest.aspectRatio || "16:9",
            duration: rest.duration ?? 5,
            resolution: rest.resolution || 480,
            quality: rest.quality || "medium",
            lottery: rest.lottery ?? null
          }
        }
      };
      const response = await this.api.post("/ai.textToVideo?batch=1", payload, {
        headers: {
          cookie: `auth_session=${session}`
        }
      });
      console.log("Log Respon Data:", JSON.stringify(response.data));
      const taskId = response.data?.["0"]?.result?.data?.json;
      if (!taskId) throw new Error("Gagal mendapatkan task_id dari respons.");
      console.log("Proses: Berhasil memulai pembuatan video dari teks.");
      return {
        task_id: taskId,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.[0]?.error?.json?.message || error.message;
      console.error(`Proses txt2vid gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2vid({
    key,
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      const {
        session,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const cfToken = await this._getCfToken();
      console.log("Proses: Membuat video dari gambar...");
      const payload = {
        0: {
          json: {
            token: cfToken,
            image: imageUrl,
            content: prompt,
            duration: rest.duration ?? 5,
            resolution: rest.resolution || 480,
            quality: rest.quality || "medium",
            lottery: rest.lottery ?? null
          }
        }
      };
      const response = await this.api.post("/ai.imageToVideo?batch=1", payload, {
        headers: {
          cookie: `auth_session=${session}`
        }
      });
      console.log("Log Respon Data:", JSON.stringify(response.data));
      const taskId = response.data?.["0"]?.result?.data?.json;
      if (!taskId) throw new Error("Gagal mendapatkan task_id dari respons.");
      console.log("Proses: Berhasil memulai pembuatan video dari gambar.");
      return {
        task_id: taskId,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.[0]?.error?.json?.message || error.message;
      console.error(`Proses img2vid gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    task_id
  }) {
    try {
      const {
        session,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk task_id ${task_id}...`);
      const params = new URLSearchParams({
        input: JSON.stringify({
          0: {
            json: {
              id: task_id
            }
          }
        })
      }).toString();
      const response = await this.api.get(`/model.getModel?batch=1&${params}`, {
        headers: {
          cookie: `auth_session=${session}`
        }
      });
      console.log("Log Respon Data:", JSON.stringify(response.data));
      const resultData = response.data?.["0"]?.result?.data?.json;
      if (!resultData) throw new Error("Data status tidak ditemukan pada respons.");
      console.log("Proses: Berhasil mendapatkan status tugas.");
      return {
        ...resultData,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.[0]?.error?.json?.message || error.message;
      console.error(`Proses status gagal: ${errorMessage}`);
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
  const api = new AiVideoMakerAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'prompt' dan 'imageUrl' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
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
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'txt2vid', 'img2vid', 'list_key', 'del_key' dan 'status'.`
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