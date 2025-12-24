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
  async createEmail() {
    try {
      console.log("Proses: Membuat email sementara...");
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      console.log("Proses: Email berhasil dibuat");
      return response.data?.email;
    } catch (error) {
      console.error(`[ERROR] Gagal membuat email: ${error.message}`);
      throw error;
    }
  }
  async checkMessages(email) {
    try {
      console.log(`Proses: Mengecek pesan untuk email ${email}...`);
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const messages = response.data?.data || [];
      if (messages.length > 0) {
        const textContent = messages[0]?.text_content;
        if (textContent) {
          const verifyMatch = textContent.match(/https:\/\/nanobanana\.art\/api\/auth\/verify-email\?token=([a-zA-Z0-9.\-_]+)/);
          return verifyMatch ? verifyMatch[0] : null;
        }
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal memeriksa pesan: ${error.message}`);
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
      return response.data?.key;
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
      return response.data?.content;
    } catch (error) {
      console.error(`[ERROR] Gagal mengambil paste: ${error.message}`);
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
      console.error(`[ERROR] Gagal mengambil daftar paste: ${error.message}`);
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
      return response.data ? true : false;
    } catch (error) {
      console.error(`[ERROR] Gagal menghapus paste: ${error.message}`);
      return false;
    }
  }
}
class NanoBananaAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://nanobanana.art",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://nanobanana.art",
        referer: "https://nanobanana.art/",
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
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) {
      throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan`);
    }
    try {
      const sessionData = JSON.parse(savedSession);
      const token = sessionData.token;
      const sessionToken = sessionData.session_token;
      if (!token || !sessionToken) {
        throw new Error("Token tidak valid di sesi yang tersimpan");
      }
      console.log("Proses: Sesi berhasil dimuat");
      return {
        token: token,
        sessionToken: sessionToken
      };
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _pollVerification(email, maxAttempts = 60) {
    console.log("Proses: Menunggu link verifikasi...");
    for (let i = 0; i < maxAttempts; i++) {
      const verifyLink = await this.wudysoft.checkMessages(email);
      if (verifyLink) {
        console.log("Proses: Link verifikasi ditemukan");
        return verifyLink;
      }
      console.log(`Proses: Menunggu 3 detik... (${i + 1}/${maxAttempts})`);
      await sleep(3e3);
    }
    throw new Error("Timeout: Link verifikasi tidak ditemukan");
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan akun baru...");
      const email = await this.wudysoft.createEmail();
      if (!email) throw new Error("Gagal membuat email");
      console.log(`Proses: Email dibuat: ${email}`);
      const password = `${this._random()}A1`;
      const name = `User${this._random().substring(0, 6)}`;
      const signupResponse = await this.api.post("/api/auth/sign-up/email", {
        email: email,
        password: password,
        name: name,
        callbackURL: "/app/settings/general"
      }, {
        headers: {
          "x-device-fingerprint": this._random() + this._random(),
          "x-initial-landing-page": "https://nanobanana.art/"
        }
      });
      console.log("Proses: Pendaftaran berhasil, menunggu verifikasi...");
      const verifyLink = await this._pollVerification(email);
      const token = new URL(verifyLink).searchParams.get("token");
      await this.api.get(`/api/auth/verify-email?token=${token}&callbackURL=/app/settings/general`);
      console.log("Proses: Email terverifikasi");
      const loginResponse = await this.api.post("/api/auth/sign-in/email", {
        mode: "password",
        email: email,
        password: password
      });
      const userData = loginResponse.data;
      if (!userData?.token) throw new Error("Gagal login setelah verifikasi");
      console.log("Proses: Login berhasil");
      const sessionToSave = JSON.stringify({
        token: userData.token,
        sessionToken: userData.token,
        email: email,
        user: userData.user
      });
      const sessionKey = await this.wudysoft.createPaste(`nanobanana-${this._random()}`, sessionToSave);
      if (!sessionKey) throw new Error("Gagal menyimpan sesi");
      console.log(`-> Akun berhasil didaftarkan. Kunci: ${sessionKey}`);
      await this.checkin({
        key: sessionKey
      });
      return {
        key: sessionKey
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Proses registrasi gagal: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }
  async _ensureValidSession({
    key
  }) {
    if (key) {
      try {
        const session = await this._getSessionFromKey(key);
        return {
          ...session,
          key: key
        };
      } catch (error) {
        console.warn(`[PERINGATAN] ${error.message}. Mendaftarkan sesi baru...`);
      }
    }
    console.log("Proses: Kunci tidak valid, mendaftarkan sesi baru...");
    const newSession = await this.register();
    if (!newSession?.key) throw new Error("Gagal mendaftarkan sesi baru");
    const session = await this._getSessionFromKey(newSession.key);
    return {
      ...session,
      key: newSession.key
    };
  }
  async generate({
    key,
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      const {
        sessionToken,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Membuat gambar...");
      let inputImages = [];
      if (imageUrl) {
        console.log("Proses: Mengunggah gambar...");
        const uploadedUrls = await this._uploadImages(sessionToken, imageUrl);
        inputImages = uploadedUrls;
      }
      const generateData = {
        prompt: prompt,
        mode: imageUrl ? "edit" : "generate",
        aspectRatio: rest.aspectRatio || "16:9",
        model: rest.model || "nano-banana",
        outputFormat: rest.outputFormat || "jpeg",
        enableTranslation: rest.enableTranslation ?? true,
        promptUpsampling: rest.promptUpsampling ?? false,
        safetyTolerance: rest.safetyTolerance ?? 2,
        uploadCn: rest.uploadCn ?? false,
        inputImages: inputImages.length > 0 ? inputImages : undefined,
        ...rest
      };
      const response = await this.api.post("/api/generate-image", generateData, {
        headers: {
          cookie: `__Secure-better-auth.session_token=${sessionToken}; NEXT_LOCALE=en`
        }
      });
      console.log("Proses: Generate task berhasil dibuat");
      return {
        task_id: response.data?.data?.uuid,
        key: currentKey
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Proses generate gagal: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }
  async _uploadImages(sessionToken, imageUrl) {
    const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
    const uploadedUrls = [];
    for (const img of images) {
      const timestamp = Date.now();
      const filename = `${timestamp}-${this._random()}.${img.includes("jpeg") ? "jpg" : "png"}`;
      const presignResponse = await this.api.post(`/api/uploads/signed-upload-url?bucket=images&path=%2F${filename}`, {}, {
        headers: {
          cookie: `__Secure-better-auth.session_token=${sessionToken}; NEXT_LOCALE=en`
        }
      });
      const signedUrl = presignResponse.data?.signedUrl;
      if (!signedUrl) throw new Error("Gagal mendapatkan signed URL");
      let imageBuffer;
      if (Buffer.isBuffer(img)) {
        imageBuffer = img;
      } else if (img.startsWith("http")) {
        const response = await axios.get(img, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
      } else if (img.startsWith("data:")) {
        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
      } else {
        imageBuffer = Buffer.from(img, "base64");
      }
      await axios.put(signedUrl, imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": imageBuffer.length
        }
      });
      const finalUrl = signedUrl.split("?")[0];
      uploadedUrls.push(finalUrl);
      console.log(`Proses: Gambar berhasil diunggah: ${finalUrl}`);
    }
    return uploadedUrls;
  }
  async status({
    key,
    task_id,
    ...rest
  }) {
    try {
      const {
        sessionToken,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status task ${task_id}...`);
      const response = await this.api.post("/api/get-image", {
        image_id: task_id,
        ...rest
      }, {
        headers: {
          cookie: `__Secure-better-auth.session_token=${sessionToken}; NEXT_LOCALE=en`
        }
      });
      console.log("Proses: Status berhasil diambil");
      return {
        ...response.data?.data,
        key: currentKey
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Proses status gagal: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }
  async checkin({
    key,
    ...rest
  }) {
    try {
      const {
        sessionToken,
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Melakukan checkin...");
      const response = await this.api.post("/api/checkin", {}, {
        headers: {
          cookie: `__Secure-better-auth.session_token=${sessionToken}; NEXT_LOCALE=en`
        }
      });
      console.log("Proses: Checkin berhasil");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Proses checkin gagal: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }
  async del_user({
    key,
    ...rest
  }) {
    try {
      const {
        sessionToken
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Menghapus user...");
      const response = await this.api.post("/api/auth/delete-user", {}, {
        headers: {
          cookie: `__Secure-better-auth.session_token=${sessionToken}; NEXT_LOCALE=en`
        }
      });
      console.log("Proses: User berhasil dihapus");
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Proses delete user gagal: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar kunci...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title?.startsWith("nanobanana-")).map(paste => paste.key);
    } catch (error) {
      console.error(`Gagal mengambil daftar kunci: ${error.message}`);
      throw error;
    }
  }
  async del_key({
    key,
    ...rest
  }) {
    if (!key) {
      console.error("Kunci tidak disediakan");
      return false;
    }
    try {
      console.log(`Proses: Menghapus kunci: ${key}`);
      const success = await this.wudysoft.delPaste(key);
      console.log(success ? "Kunci berhasil dihapus" : "Gagal menghapus kunci");
      return success;
    } catch (error) {
      console.error(`Error menghapus kunci: ${error.message}`);
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
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'generate'."
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
      case "checkin":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'checkin'."
          });
        }
        response = await api.checkin(params);
        break;
      case "del_user":
        if (!params.key) {
          return res.status(400).json({
            error: "Paramenter 'key' wajib diisi untuk action 'del_user'."
          });
        }
        response = await api.del_user(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'generate', 'status', 'checkin', 'del_user', 'list_key', 'del_key'.`
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