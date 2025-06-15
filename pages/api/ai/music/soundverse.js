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
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class SoundverseAPI {
  constructor() {
    this.api = axios.create({
      jar: new CookieJar(),
      withCredentials: true
    });
    axiosCookieJarSupport(this.api);
    this.email = null;
    this.csrfToken = null;
    this.userId = null;
    this.api.defaults.headers.common["User-Agent"] = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.setupInterceptors();
  }
  async generate(generationParams) {
    try {
      await this._fullAuthFlow();
      const projectId = await this._createProject();
      const generateResponse = await this._internalGenerateMusic(projectId, generationParams);
      const messageId = generateResponse.messageId;
      if (!messageId) throw new Error("Gagal mendapatkan messageId dari respons /generate.");
      const finalResult = await this._pollTaskStatus(projectId, messageId);
      if (finalResult?.audioData?.length > 0) {
        return {
          success: true,
          audioData: finalResult.audioData,
          albumArt: finalResult.albumArt
        };
      } else {
        throw new Error("Proses selesai, namun tidak ada data audio yang ditemukan.");
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
          referer: "https://www.soundverse.ai/"
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
          referer: "https://www.soundverse.ai/"
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
          referer: "https://www.soundverse.ai/"
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
        prompt: params.prompt,
        actionByUser: params.action || "song_gen" || "vocals_gen" || "generate_music" || "other",
        duration: params.duration || 30,
        loop: params.loop || false,
        model: params.model || "sansaar_1_lite"
      };
      const response = await this.api.post("https://api.soundverse.ai/generate/", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://www.soundverse.ai",
          referer: "https://www.soundverse.ai/"
        }
      });
      console.log("Permintaan pembuatan musik berhasil dikirim.");
      return response.data;
    } catch (error) {
      throw new Error("Gagal memulai pembuatan musik.");
    }
  }
  async _pollTaskStatus(projectId, messageId) {
    console.log(`Memantau status untuk messageId: ${messageId}...`);
    const maxAttempts = 60;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await this.api.get(`https://api.soundverse.ai/studio/getAllMessages/?projectId=${projectId}`);
        const message = response.data.data.find(m => m._id === messageId);
        if (message) {
          console.log(`[Percobaan ${attempt}/${maxAttempts}] Status saat ini: ${message.status}`);
          if (message.status === "SUCCESSFUL") {
            console.log("Pembuatan musik berhasil!");
            return message;
          } else if (message.status === "FAILED" || message.status === "REJECTED") {
            throw new Error(`Pembuatan musik gagal dengan status: ${message.status}`);
          }
        }
      } catch (error) {}
      if (attempt < maxAttempts) await delay(3e3);
    }
    throw new Error("Waktu pemantauan habis, tugas tidak selesai tepat waktu.");
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
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const soundverse = new SoundverseAPI();
    const response = await soundverse.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}