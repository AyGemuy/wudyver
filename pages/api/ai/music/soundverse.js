import axios from "axios";
import {
  URLSearchParams
} from "url";
import {
  wrapper as axiosCookieJarSupport
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import Encoder from "@/lib/encoder";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class SoundverseAPI {
  constructor() {
    this.jar = new CookieJar();
    this.api = axios.create({
      jar: this.jar,
      withCredentials: true
    });
    axiosCookieJarSupport(this.api);
    this.email = null;
    this.csrfToken = null;
    this.userId = null;
    this.api.defaults.headers.common["User-Agent"] = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.setupInterceptors();
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async restoreSession({
    cookieStoreString,
    csrfToken,
    userId
  }) {
    if (cookieStoreString) {
      const serializedJar = JSON.parse(cookieStoreString);
      this.jar = CookieJar.fromJSON(serializedJar);
      this.api.defaults.jar = this.jar;
    }
    this.csrfToken = csrfToken;
    this.userId = userId;
    console.log("[LOG] Sesi berhasil dipulihkan dari taskId.");
  }
  async create({
    prompt,
    ...rest
  }) {
    try {
      await this._fullAuthFlow();
      const projectId = await this._createProject();
      const generationParams = {
        prompt: prompt,
        ...rest
      };
      const generateResponse = await this._internalGenerateMusic(projectId, generationParams);
      const messageId = generateResponse.messageId;
      if (!messageId) {
        throw new Error("Gagal mendapatkan messageId dari respons /generate.");
      }
      const cookieStoreString = JSON.stringify(this.jar.toJSON());
      const taskId = await this.enc({
        projectId: projectId,
        messageId: messageId,
        csrfToken: this.csrfToken,
        userId: this.userId,
        cookieStoreString: cookieStoreString
      });
      return {
        success: true,
        task_id: taskId
      };
    } catch (error) {
      console.error("\n--- PROSES GAGAL ---\nTerjadi kesalahan fatal:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async status({
    task_id
  }) {
    try {
      const {
        projectId,
        messageId,
        cookieStoreString,
        csrfToken,
        userId
      } = await this.dec(task_id);
      await this.restoreSession({
        cookieStoreString: cookieStoreString,
        csrfToken: csrfToken,
        userId: userId
      });
      const response = await this.api.get(`https://api.soundverse.ai/studio/getAllMessages/?projectId=${projectId}`);
      const message = response.data.data.find(m => m._id === messageId);
      if (!message) {
        throw new Error(`Pesan dengan messageId: ${messageId} tidak ditemukan.`);
      }
      if (message.status === "SUCCESSFUL") {
        return {
          success: true,
          status: "SUCCESSFUL",
          audioData: message.audioData,
          albumArt: message.albumArt
        };
      } else if (message.status === "FAILED" || message.status === "REJECTED") {
        return {
          success: false,
          status: message.status,
          error: `Pembuatan musik gagal dengan status: ${message.status}`
        };
      } else {
        return {
          success: true,
          status: "IN_PROGRESS"
        };
      }
    } catch (error) {
      console.error("\n--- PROSES GAGAL ---\nTerjadi kesalahan fatal:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  _setupInterceptors() {
    this.api.interceptors.request.use(config => {
      console.log(`--> ${config.method.toUpperCase()} ${config.url}`);
      return config;
    }, error => Promise.reject(error));
    this.api.interceptors.response.use(response => {
      console.log(`<-- ${response.status} ${response.config.url}`);
      return response;
    }, error => {
      if (error.response) {
        console.error(`<-- ${error.response.status} ${error.config.url}`, error.response.data || "");
      } else {
        console.error("<-- Network Error:", error.message);
      }
      return Promise.reject(error);
    });
  }
  setupInterceptors = this._setupInterceptors;
  _generateRandomPassword(length = 12) {
    return randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }
  async _createMail() {
    try {
      const response = await this.api.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.email = response.data.email;
      console.log(`[LOG] Email Dibuat: ${this.email}`);
    } catch (error) {
      throw new Error("Gagal membuat email sementara.");
    }
  }
  async _getCsrfToken() {
    try {
      const response = await this.api.get("https://www.soundverse.ai/api/auth/csrf");
      this.csrfToken = response.data.csrfToken;
      console.log(`[LOG] CSRF Token Didapatkan.`);
    } catch (error) {
      throw new Error("Gagal mendapatkan CSRF token.");
    }
  }
  async _signup(password) {
    try {
      const payload = {
        name: this.email,
        email: this.email,
        password: password,
        isAppSumoUser: false
      };
      await this.api.post("https://www.soundverse.ai/api/auth/signup", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://www.soundverse.ai",
          referer: "https://www.soundverse.ai/",
          ...SpoofHead()
        }
      });
      console.log("Pendaftaran berhasil.");
      return "NEW_USER";
    } catch (error) {
      if (error.response?.data?.message === "AlreadyUser") {
        return "ALREADY_EXISTS";
      }
      throw new Error("Proses pendaftaran gagal.");
    }
  }
  async _login(password) {
    try {
      const data = new URLSearchParams({
        redirect: "false",
        email: this.email,
        password: password,
        callbackUrl: "https://www.soundverse.ai/studio",
        csrfToken: this.csrfToken,
        json: "true"
      });
      await this.api.post("https://www.soundverse.ai/api/auth/callback/credentials", data.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://www.soundverse.ai",
          referer: "https://www.soundverse.ai/",
          ...SpoofHead()
        }
      });
      console.log("Login berhasil, sesi sekarang seharusnya aktif.");
    } catch (error) {
      throw new Error("Proses login gagal.");
    }
  }
  async _checkVerificationLink() {
    console.log("Memantau email masuk untuk link verifikasi...");
    const maxAttempts = 20;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await this.api.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        if (response.data.data && response.data.data.length > 0) {
          const linkMatch = response.data.data[0].text_content.match(/\[Verify Email Address\]\((.*?)\)/);
          if (linkMatch && linkMatch[1]) {
            console.log(`[LOG] Link Verifikasi Ditemukan.`);
            return linkMatch[1];
          }
        }
      } catch (error) {}
      if (attempt < maxAttempts) await delay(3e3);
    }
    return null;
  }
  async _visitVerificationLink(link) {
    try {
      await this.api.get(link);
      console.log("Verifikasi email berhasil diproses.");
    } catch (error) {
      if (error.response?.data?.message === "Email already verified") {
        console.log("Email sudah terverifikasi sebelumnya, ini tidak masalah.");
        return;
      }
      throw new Error("Gagal mengunjungi link verifikasi.");
    }
  }
  async _getApiSessionData() {
    try {
      const response = await this.api.get("https://www.soundverse.ai/api/auth/session");
      const userId = response.data?.user?.id;
      if (!userId) throw new Error(`Respons sesi tidak berisi user.id.`);
      this.userId = userId;
      console.log(`[LOG] Sesi aktif untuk UserId: ${this.userId}`);
    } catch (error) {
      throw new Error(`Gagal mengambil data sesi dari API. ${error.message}`);
    }
  }
  async _createProject() {
    if (!this.userId) throw new Error("Tidak bisa membuat proyek karena userId belum ada.");
    try {
      const payload = {
        userId: this.userId
      };
      const response = await this.api.post("https://api.soundverse.ai/studio/project/create/", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://www.soundverse.ai",
          referer: "https://www.soundverse.ai/",
          ...SpoofHead()
        }
      });
      const projectId = response.data?.data?._id;
      if (!projectId) throw new Error(`Gagal mendapatkan _id proyek dari respons.`);
      console.log(`[LOG] Proyek baru berhasil dibuat dengan ID: ${projectId}`);
      return projectId;
    } catch (error) {
      throw new Error("Gagal saat memanggil API pembuatan proyek.");
    }
  }
  async _internalGenerateMusic(projectId, params) {
    try {
      const payload = {
        userId: this.userId,
        projectId: projectId,
        prompt: params.prompt || `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
        actionByUser: params.type || "song_gen" || "vocals_gen" || "generate_music" || "other",
        duration: params.duration || 30,
        loop: params.loop || false,
        model: params.model || "sansaar_1_lite"
      };
      const response = await this.api.post("https://api.soundverse.ai/generate/", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://www.soundverse.ai",
          referer: "https://www.soundverse.ai/",
          ...SpoofHead()
        }
      });
      console.log("Permintaan pembuatan musik berhasil dikirim.");
      return response.data;
    } catch (error) {
      throw new Error("Gagal memulai pembuatan musik.");
    }
  }
  async _fullAuthFlow() {
    await this._createMail();
    const randomPassword = this._generateRandomPassword(16);
    console.log(`[LOG] Password Acak Disiapkan.`);
    await this._getCsrfToken();
    const signupStatus = await this._signup(randomPassword);
    if (signupStatus === "ALREADY_EXISTS") {
      console.log("Pengguna sudah terdaftar. Melakukan login...");
      await this._login(randomPassword);
    } else {
      console.log("Pendaftaran baru berhasil. Melakukan login untuk membuat sesi...");
      await this._login(randomPassword);
      const verificationLink = await this._checkVerificationLink();
      if (verificationLink) {
        await this._visitVerificationLink(verificationLink);
      } else {
        console.log("Link verifikasi tidak ditemukan, melanjutkan karena sesi sudah aktif dari login.");
      }
    }
    await this._getApiSessionData();
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (create or status) is required."
    });
  }
  const generator = new SoundverseAPI();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "prompt is required for 'create' action."
          });
        }
        const createResponse = await generator.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await generator.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}