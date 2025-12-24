import axios from "axios";
import FormData from "form-data";
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
        const match = content.match(/https:\/\/geminigen\.ai\/auth\/activate-account\/\?token=([a-zA-Z0-9.\-_]+)/);
        return match ? match[0] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessages' untuk email ${email}: ${error.message}`);
      return null;
    }
  }
  async upload(base64Image) {
    console.log("Proses: Mengunggah gambar...");
    try {
      const form = new FormData();
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      form.append("file", imageBuffer, {
        filename: `geminigen-${this._random()}.jpg`,
        contentType: "image/jpeg"
      });
      const response = await this.client.post("/tools/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Gambar berhasil diunggah.");
      return response.data || null;
    } catch (error) {
      console.error(`Proses unggah gagal: ${error.response?.data?.message || error.message}`);
      return null;
    }
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
}
class GeminiGenAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.geminigen.ai/api",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        origin: "https://geminigen.ai",
        referer: "https://geminigen.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) {
      throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan atau telah kedaluwarsa.`);
    }
    try {
      const sessionData = JSON.parse(savedSession);
      const token = sessionData.token;
      if (!token) throw new Error("Token tidak valid di sesi yang tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi dari kunci "${key}": ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("Proses: Memulai registrasi akun baru...");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const fullName = `user_${this._random()}`;
    const password = `${this._random()}A1`;
    await this.api.post("/signup", {
      email: email,
      full_name: fullName,
      password: password
    });
    console.log("Proses: Pendaftaran berhasil, mencari link verifikasi...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessages(email);
      if (verificationLink) break;
      console.log(`Proses: Belum ada link verifikasi, menunggu 3 detik... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 60 detik.");
    console.log("Proses: Link verifikasi ditemukan.");
    const tokenFromLink = new URL(verificationLink).searchParams.get("token");
    const activateResponse = await this.api.put("/activate-account", {
      token: tokenFromLink,
      platform: "WEB"
    });
    const accessToken = activateResponse.data?.access_token;
    if (!accessToken) throw new Error("Gagal mendapatkan access token setelah aktivasi.");
    console.log("Proses: Aktivasi akun berhasil.");
    return {
      token: accessToken,
      email: email,
      password: password
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi baru...");
      const {
        token,
        email,
        password
      } = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        token: token,
        email: email,
        password: password
      });
      const sessionTitle = `geminigen-token-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru ke Wudysoft.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: email,
        password: password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses registrasi gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async login({
    email,
    password
  }) {
    try {
      console.log(`Proses: Mencoba login dengan email: ${email}`);
      const response = await this.api.post("/login-v2", {
        username: email,
        password: password
      }, {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      const accessToken = response.data?.access_token;
      if (!accessToken) throw new Error("Gagal mendapatkan access token dari login.");
      console.log("Proses: Login berhasil.");
      const sessionToSave = JSON.stringify({
        token: accessToken,
        email: email,
        password: password
      });
      const sessionTitle = `geminigen-token-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi login ke Wudysoft.");
      console.log(`-> Sesi login berhasil disimpan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        token: accessToken,
        email: email,
        password: password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses login gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async me({
    key
  }) {
    try {
      const sessionData = await this._getTokenFromKey(key);
      const token = sessionData.token;
      console.log("Proses: Mengambil informasi pengguna...");
      const response = await this.api.get("/me", {
        headers: {
          authorization: `Bearer ${token}`,
          "sec-ch-ua": `"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"`,
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": `"Android"`
        }
      });
      console.log("Proses: Berhasil mendapatkan informasi pengguna.");
      return {
        ...response.data,
        key: key,
        email: sessionData.email,
        password: sessionData.password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses me gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async _ensureValidSession({
    key
  }) {
    if (key) {
      try {
        const sessionData = await this._getTokenFromKey(key);
        return {
          token: sessionData.token,
          email: sessionData.email,
          password: sessionData.password,
          key: key
        };
      } catch (error) {
        console.warn(`[PERINGATAN] ${error.message}. Mendaftarkan sesi baru secara otomatis...`);
      }
    } else {
      console.log("Proses: Kunci tidak disediakan, mendaftarkan sesi baru...");
    }
    const newSession = await this.register();
    if (!newSession?.key) {
      throw new Error("Gagal mendaftarkan sesi baru secara otomatis.");
    }
    console.log(`-> PENTING: Simpan kunci baru ini untuk penggunaan selanjutnya: ${newSession.key}`);
    const sessionData = await this._getTokenFromKey(newSession.key);
    return {
      token: sessionData.token,
      email: sessionData.email,
      password: sessionData.password,
      key: newSession.key
    };
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("geminigen-token-")).map(paste => paste.key);
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
  async txt2vid({
    key,
    prompt,
    ...rest
  }) {
    try {
      const {
        token,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Membuat video dari teks...");
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("model", rest.model || "veo-3-fast");
      form.append("aspect_ratio", rest.aspect_ratio || "9:16");
      form.append("duration", (rest.duration || 8).toString());
      form.append("resolution", rest.resolution || "720p");
      const response = await this.api.post("/video-gen/veo", form, {
        headers: {
          authorization: `Bearer ${token}`,
          ...form.getHeaders()
        }
      });
      console.log("Proses: Berhasil memulai pembuatan video dari teks.");
      return {
        task_id: response.data?.uuid,
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
    ...rest
  }) {
    try {
      const {
        token,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Membuat video dari gambar...");
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("model", rest.model || "veo-3-fast");
      form.append("aspect_ratio", rest.aspect_ratio || "9:16");
      form.append("duration", (rest.duration || 8).toString());
      form.append("resolution", rest.resolution || "720p");
      let imageBuffer;
      if (Buffer.isBuffer(imageUrl)) {
        imageBuffer = imageUrl;
      } else if (imageUrl.startsWith("http")) {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
      } else {
        imageBuffer = Buffer.from(imageUrl, "base64");
      }
      form.append("files", imageBuffer, {
        filename: "image.jpg"
      });
      const response = await this.api.post("/video-gen/veo", form, {
        headers: {
          authorization: `Bearer ${token}`,
          ...form.getHeaders()
        }
      });
      console.log("Proses: Berhasil memulai pembuatan video dari gambar.");
      return {
        task_id: response.data?.uuid,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
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
        token,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk task_id ${task_id}...`);
      const response = await this.api.get(`/history/${task_id}`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      console.log("Proses: Berhasil mendapatkan status tugas.");
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
  async txt2img({
    key,
    prompt,
    ...rest
  }) {
    try {
      const {
        token,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Membuat gambar dari teks...");
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("model", rest.model || "imagen-4-ultra");
      form.append("style", rest.style || "Fashion");
      form.append("aspect_ratio", rest.aspect_ratio || "1:1");
      const response = await this.api.post("/generate_image", form, {
        headers: {
          authorization: `Bearer ${token}`,
          ...form.getHeaders()
        }
      });
      console.log("Proses: Berhasil membuat gambar dari teks.");
      const result = {
        ...response.data,
        key: currentKey
      };
      if (result.base64_images) {
        const uploadedUrl = await this.wudysoft.upload(result.base64_images);
        if (uploadedUrl) {
          result.upload = uploadedUrl;
        }
      }
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2img gagal: ${errorMessage}`);
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
  const api = new GeminiGenAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "login":
        if (!params.email || !params.password) {
          return res.status(400).json({
            error: "Paramenter 'email' dan 'password' wajib diisi untuk action 'login'."
          });
        }
        response = await api.login(params);
        break;
      case "me":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'me'."
          });
        }
        response = await api.me(params);
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'me', 'txt2vid', 'txt2img', 'img2vid', 'list_key', 'del_key', 'status'.`
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