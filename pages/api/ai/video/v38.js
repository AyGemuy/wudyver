import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import {
  randomBytes,
  randomUUID
} from "crypto";
import apiConfig from "@/configs/apiConfig";
import PROMPT from "@/configs/ai-prompt";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
    });
  }
  async createEmail() {
    try {
      console.log("[INFO] Wudysoft: Membuat email sementara...");
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "create"
        }
      });
      if (response.data?.email) {
        console.log(`[SUCCESS] Wudysoft: Email dibuat -> ${response.data.email}`);
        return response.data.email;
      }
      throw new Error("Respon API tidak mengandung email.");
    } catch (error) {
      console.error(`[ERROR] Wudysoft CreateEmail: ${error.message}`);
      throw error;
    }
  }
  async checkMessagesVideoSora(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/verification code is:[\s\r\n]+(\d{6})/i);
        if (match) {
          console.log(`[SUCCESS] Wudysoft: OTP Ditemukan -> ${match[1]}`);
          return match[1];
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  async createPaste(title, content) {
    try {
      console.log(`[INFO] Wudysoft: Menyimpan sesi ke Pastebin (${title})...`);
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "create",
          title: title,
          content: content
        }
      });
      if (response.data?.key) {
        return response.data.key;
      }
      throw new Error("Gagal mendapatkan key pastebin.");
    } catch (error) {
      console.error(`[ERROR] Wudysoft CreatePaste: ${error.message}`);
      throw error;
    }
  }
  async getPaste(key) {
    try {
      console.log(`[INFO] Wudysoft: Mengambil sesi dari key ${key}...`);
      const response = await this.client.get("/tools/paste/v1", {
        params: {
          action: "get",
          key: key
        }
      });
      return response.data?.content || null;
    } catch (error) {
      console.error(`[ERROR] Wudysoft GetPaste: ${error.message}`);
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
    } catch (e) {
      return [];
    }
  }
  async delPaste(key) {
    try {
      await this.client.get("/tools/paste/v1", {
        params: {
          action: "delete",
          key: key
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}
class VideoSora2API {
  constructor() {
    this.cookieJar = new CookieJar();
    this.baseUrl = "https://videosora2.com";
    this.wudysoft = new WudysoftAPI();
    this.defaultHeaders = {
      "accept-language": "id-ID",
      origin: "https://videosora2.com",
      referer: "https://videosora2.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      priority: "u=1, i",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    this.api = wrapper(axios.create({
      baseURL: this.baseUrl,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        ...this.defaultHeaders,
        accept: "*/*"
      }
    }));
  }
  _calculateCost(duration = "10", quality = "standard", model = "sora-2-image-to-video") {
    if (model === "sora-2-image-to-video" || model === "sora-2") {
      return duration === "15" ? 8 : 6;
    }
    return 6;
  }
  async _getCsrfToken() {
    try {
      const response = await this.api.get("/api/auth/csrf");
      return response.data?.csrfToken;
    } catch (error) {
      console.error("[ERROR] Gagal mengambil CSRF Token.");
      throw error;
    }
  }
  async _getTokenFromKey(key) {
    try {
      const savedSession = await this.wudysoft.getPaste(key);
      if (!savedSession) throw new Error("Key pastebin tidak ditemukan/kosong.");
      let sessionData;
      try {
        sessionData = JSON.parse(savedSession);
      } catch (e) {
        throw new Error("Format data sesi rusak (bukan JSON).");
      }
      if (!sessionData.cookieString) {
        throw new Error("Format sesi lama (Cookie Array). Silakan buat sesi baru.");
      }
      console.log("[INFO] Merestore header sesi (Cookie & User-Agent)...");
      this.api.defaults.headers["cookie"] = sessionData.cookieString;
      if (sessionData.userAgent) {
        this.api.defaults.headers["user-agent"] = sessionData.userAgent;
      }
      console.log("[SUCCESS] Sesi berhasil direstore dari Pastebin.");
      return sessionData;
    } catch (error) {
      console.error(`[ERROR] Load Session: ${error.message}`);
      throw error;
    }
  }
  async _performRegistration() {
    console.log("[INFO] === MEMULAI PROSES REGISTRASI BARU ===");
    this.api.defaults.headers["cookie"] = undefined;
    try {
      const email = await this.wudysoft.createEmail();
      const csrfToken = await this._getCsrfToken();
      console.log("[INFO] Mengirim permintaan OTP ke API...");
      await this.api.post("/api/auth/otp/request", {
        email: email
      });
      console.log("[SUCCESS] OTP Request terkirim.");
      console.log("[INFO] Menunggu email OTP masuk...");
      let otpCode = null;
      for (let i = 0; i < 60; i++) {
        otpCode = await this.wudysoft.checkMessagesVideoSora(email);
        if (otpCode) break;
        await sleep(3e3);
      }
      if (!otpCode) throw new Error("Timeout: OTP tidak diterima setelah 3 menit.");
      console.log("[INFO] Memverifikasi kode OTP...");
      const callbackData = new URLSearchParams();
      callbackData.append("email", email);
      callbackData.append("code", otpCode);
      callbackData.append("redirect", "false");
      callbackData.append("csrfToken", csrfToken);
      callbackData.append("callbackUrl", "https://videosora2.com/");
      await this.api.post("/api/auth/callback/otp?", callbackData.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-auth-return-redirect": "1"
        }
      });
      console.log("[SUCCESS] OTP Terverifikasi, Login berhasil.");
      try {
        await this.api.get("/api/auth/session");
      } catch (e) {}
      console.log("[INFO] Menunggu saldo kredit aktif...");
      let userInfo = null;
      for (let i = 0; i < 10; i++) {
        userInfo = await this.getUserInfo();
        if (userInfo?.credits?.left_credits > 0) {
          console.log(`[SUCCESS] Saldo Diterima: ${userInfo.credits.left_credits} credits.`);
          break;
        }
        await sleep(1e3);
      }
      if (!userInfo?.credits?.left_credits) throw new Error("Akun berhasil dibuat, tetapi saldo kredit 0/kosong.");
      const cookieString = await this.cookieJar.getCookieString(this.baseUrl);
      const userAgent = this.api.defaults.headers["user-agent"];
      return {
        email: email,
        cookieString: cookieString,
        userAgent: userAgent,
        userInfo: userInfo
      };
    } catch (error) {
      console.error(`[ERROR] Registrasi Gagal: ${error.message}`);
      throw error;
    }
  }
  async getUserInfo() {
    try {
      const res = await this.api.post("/api/get-user-info", {}, {
        headers: {
          "content-length": "0"
        }
      });
      return res.data?.data;
    } catch (e) {
      return null;
    }
  }
  async register() {
    try {
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        email: sessionData.email,
        cookieString: sessionData.cookieString,
        userAgent: sessionData.userAgent,
        credits: sessionData.userInfo?.credits
      });
      const sessionTitle = `videosora2-session-${randomUUID().substring(0, 8)}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      console.log(`[SUCCESS] Sesi baru tersimpan. KEY: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        credits: sessionData.userInfo?.credits
      };
    } catch (error) {
      throw error;
    }
  }
  async _ensureValidSession({
    key
  }) {
    if (key) {
      try {
        await this._getTokenFromKey(key);
        console.log("[INFO] Memvalidasi sesi yang direstore...");
        const user = await this.getUserInfo();
        if (user && user.credits) {
          console.log(`[INFO] Sesi Valid! Email: ${user.email}, Credits: ${user.credits.left_credits}`);
          return {
            key: key
          };
        } else {
          console.warn("[WARN] getUserInfo mengembalikan null, tapi header telah diset. Mencoba melanjutkan...");
          throw new Error("Respon User Info null.");
        }
      } catch (error) {
        console.warn(`[WARN] Sesi lama tidak dapat digunakan: ${error.message}`);
      }
    }
    console.log("[INFO] Membuat sesi/akun baru...");
    const newSession = await this.register();
    return {
      key: newSession.key
    };
  }
  async uploadImage(imageBuffer) {
    try {
      if (imageBuffer.length > 10 * 1024 * 1024) throw new Error("Ukuran gambar > 10MB");
      console.log(`[INFO] Mengupload gambar (${(imageBuffer.length / 1024).toFixed(2)} KB)...`);
      const form = new FormData();
      const filename = `${randomUUID().substring(0, 10)}.jpg`;
      form.append("file", imageBuffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      form.append("type", "image");
      const res = await this.api.post("/api/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      if (res.data?.code === 0 && res.data?.data?.url) {
        console.log("[SUCCESS] Gambar berhasil diupload.");
        return res.data.data.url;
      }
      throw new Error(res.data?.message || "Respon upload error.");
    } catch (error) {
      console.error(`[ERROR] Upload Gagal: ${error.message}`);
      throw error;
    }
  }
  async generate({
    key,
    prompt = PROMPT.text,
    imageUrl,
    aspectRatio = "9:16",
    duration = "10",
    model = "sora-2-image-to-video",
    quality = "standard"
  }) {
    try {
      if (!imageUrl) throw new Error("Parameter 'imageUrl' wajib diisi (required).");
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const cost = this._calculateCost(duration, quality, model);
      const userInfo = await this.getUserInfo();
      const currentCredits = userInfo?.credits?.left_credits || 0;
      console.log(`[INFO] Generate: Model=${model}, Biaya=${cost}, Saldo=${currentCredits}`);
      let uploadedImageUrl = null;
      let imageBuffer;
      if (Buffer.isBuffer(imageUrl)) {
        imageBuffer = imageUrl;
      } else if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        console.log("[INFO] Mendownload gambar dari URL...");
        const imgRes = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(imgRes.data);
      } else {
        throw new Error("Format 'imageUrl' tidak valid.");
      }
      uploadedImageUrl = await this.uploadImage(imageBuffer);
      const payload = {
        prompt: prompt,
        source_path: "/",
        aspect_ratio: aspectRatio,
        image_url: uploadedImageUrl,
        quality: quality,
        duration: duration,
        model: model
      };
      console.log("[INFO] Mengirim task generate video...");
      const res = await this.api.post("/api/sora2/generate", payload);
      if (res.data?.taskId) {
        console.log(`[SUCCESS] Task Created! ID: ${res.data.taskId}`);
        return {
          task_id: res.data.taskId,
          status: "pending",
          key: currentKey
        };
      }
      throw new Error(`API Error: ${JSON.stringify(res.data)}`);
    } catch (error) {
      console.error(`[ERROR] Generate Error: ${error.message}`);
      throw error;
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
      console.log(`[INFO] Cek Status Task ID: ${task_id}`);
      const res = await this.api.get(`/api/sora2/status/${task_id}`);
      const status = res.data?.status;
      const progress = res.data?.progress || 0;
      if (status === "success") console.log("[SUCCESS] Video selesai dibuat!");
      else if (status === "fail") console.error("[ERROR] Video gagal dibuat.");
      else console.log(`[INFO] Progress: ${progress}% (${status})`);
      return {
        ...res.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`[ERROR] Status Check Error: ${error.message}`);
      throw error;
    }
  }
  async list_key() {
    const all = await this.wudysoft.listPastes();
    return all.filter(p => p.title && p.title.startsWith("videosora2-session-")).map(p => p.key);
  }
  async del_key({
    key
  }) {
    const res = await this.wudysoft.delPaste(key);
    if (res) console.log(`[SUCCESS] Key ${key} dihapus.`);
    return res;
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
  const api = new VideoSora2API();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "generate":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
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
            error: "Parameter 'key' wajib diisi untuk action 'del_key'."
          });
        }
        response = await api.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'generate', 'status', 'list_key', 'del_key'.`
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