import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import CryptoJS from "crypto-js";
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
  async checkMessagesNostalgiaAI(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/https:\/\/deep-nostalgia-ai\.com\/api\/auth\/callback\?returnUrl=%2F[^&]*&token_hash=[a-f0-9]+/);
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
class DeepNostalgiaAI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Y25renFlZmlvZG5uYXp4aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4MzczNDUsImV4cCI6MjA0MjQxMzM0NX0.VR2e_NW-ycXcZrYx2wpTB4yErb7H90K48cgr3NT6Jrc";
    this.config = {
      endpoints: {
        base: "https://deep-nostalgia-ai.com/api",
        supabase: "https://cvcnkzqefiodnnazxiqa.supabase.co/auth/v1",
        sendMagicLink: "/auth/send-magic-link",
        authCallback: "/auth/callback",
        uploadR2: "/uploadFileToR2",
        uploadR2Flux: "/uploadFileToR2ForFlux",
        videoGenerate: "/FalAIVideo",
        videoStatus: "/FalAIVideoGetRes",
        textToImage: "/fluxTextToImage"
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://deep-nostalgia-ai.com",
      referer: "https://deep-nostalgia-ai.com/",
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
        "content-type": "application/json",
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
        apikey: this.supabaseKey,
        "content-type": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "x-client-info": "@supabase/auth-helpers-nextjs@0.8.7",
        "x-supabase-api-version": "2024-01-01"
      }
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  _genToken() {
    return CryptoJS.AES.encrypt(Date.now().toString(), "sk-sdfs23-gd25135adgdgagaaaag446@#42a55aaaaa").toString();
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
    const returnUrl = encodeURIComponent("/sora-2");
    const magicLinkPayload = {
      email: email,
      redirectTo: `https://deep-nostalgia-ai.com/api/auth/callback?returnUrl=${returnUrl}`
    };
    await this.api.post(this.config.endpoints.sendMagicLink, magicLinkPayload);
    console.log("Proses: Magic link berhasil dikirim, mencari link verifikasi...");
    let verificationLink = null;
    for (let i = 0; i < 60; i++) {
      verificationLink = await this.wudysoft.checkMessagesNostalgiaAI(email);
      if (verificationLink) break;
      console.log(`Proses: Menunggu link verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationLink) throw new Error("Gagal menemukan link verifikasi setelah 3 menit.");
    console.log("Proses: Link verifikasi ditemukan:", verificationLink);
    const redirectClient = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      maxRedirects: 10
    }));
    await redirectClient.get(verificationLink, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("\n====== EKSTRAKSI TOKEN ======");
    const cookies = await this.cookieJar.getCookies("https://deep-nostalgia-ai.com");
    const authCookie = cookies.find(c => c.key.startsWith("sb-") && c.key.endsWith("-auth-token"));
    if (!authCookie?.value) {
      throw new Error("Gagal mengekstrak cookie auth-token.");
    }
    try {
      const parsedValue = JSON.parse(decodeURIComponent(authCookie.value));
      const accessToken = Array.isArray(parsedValue) ? parsedValue[0] : parsedValue;
      console.log("\n[SUCCESS] Sesi berhasil diekstrak!");
      const userResponse = await this.supabaseApi.get("/user", {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      });
      return {
        access_token: accessToken,
        user: userResponse.data,
        email: email
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
      console.log("Proses: Kunci tidak valid atau tidak disediakan, mendaftarkan sesi baru...");
      const newSession = await this.register();
      if (!newSession?.key) throw new Error("Gagal mendaftarkan sesi baru.");
      console.log(`-> PENTING: Simpan kunci baru ini: ${newSession.key}`);
      currentKey = newSession.key;
      sessionData = await this._getTokenFromKey(currentKey);
    }
    const cookieValue = encodeURIComponent(JSON.stringify([sessionData.access_token, this._random(), null, null, null]));
    await this.cookieJar.setCookie(`sb-cvcnkzqefiodnnazxiqa-auth-token=${cookieValue}; Domain=.deep-nostalgia-ai.com; Path=/; Secure; SameSite=Lax`, "https://deep-nostalgia-ai.com");
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
        email: sessionData.email
      });
      const sessionTitle = `nostalgia-ai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async txt2video({
    key,
    prompt,
    model = "sora-2",
    duration = 10,
    resolution = "720p",
    orientation = "portrait"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dari teks...`);
      const payload = {
        prompts: prompt,
        model: model,
        generateType: "texttovideo",
        token: this._genToken(),
        duration: duration,
        resolution: resolution,
        orientation: orientation
      };
      const response = await this.api.post(this.config.endpoints.videoGenerate, payload);
      console.log("Proses: Tugas txt2video berhasil dibuat.");
      return {
        ...response.data,
        task_id: response.data?.request_id,
        model: model,
        type: payload.generateType,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2video({
    key,
    prompt,
    imageUrl,
    model = "sora-2",
    duration = 10,
    resolution = "720p",
    orientation = "portrait"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dari gambar...`);
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
      const base64Data = imageBuffer.toString("base64");
      const fileName = `image2video/${Date.now()}_${this._random()}.jpg`;
      const uploadPayload = {
        fileName: fileName,
        fileData: `data:image/jpeg;base64,${base64Data}`,
        mimeType: "image/jpeg"
      };
      const uploadResponse = await this.api.post(this.config.endpoints.uploadR2, uploadPayload);
      if (!uploadResponse.data.success) throw new Error("Gagal mengunggah gambar.");
      const uploadedUrl = `https://image.deep-nostalgia-ai.com/${fileName}`;
      const payload = {
        prompts: prompt || "Animate this image, bringing it to life with subtle movements while preserving the original features.",
        model: model,
        generateType: "imagetovideo",
        token: this._genToken(),
        duration: duration,
        resolution: resolution,
        orientation: orientation,
        image_url: uploadedUrl
      };
      const response = await this.api.post(this.config.endpoints.videoGenerate, payload);
      console.log("Proses: Tugas img2video berhasil dibuat.");
      return {
        ...response.data,
        task_id: response.data?.request_id,
        model: model,
        type: payload.generateType,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses img2video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2img({
    key,
    prompt,
    imageUrl,
    model = "fluxkontext"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dari gambar...`);
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
      const base64Data = imageBuffer.toString("base64");
      const fileName = `image2image/${Date.now()}_${this._random()}.jpg`;
      const uploadPayload = {
        fileName: fileName,
        fileData: `data:image/jpeg;base64,${base64Data}`,
        mimeType: "image/jpeg"
      };
      const uploadResponse = await this.api.post(this.config.endpoints.uploadR2, uploadPayload);
      if (!uploadResponse.data.success) throw new Error("Gagal mengunggah gambar.");
      const uploadedUrl = `https://image.deep-nostalgia-ai.com/${fileName}`;
      const payload = {
        prompts: prompt,
        model: model,
        generateType: "imagetoimage",
        token: this._genToken(),
        image_url: uploadedUrl
      };
      const response = await this.api.post(this.config.endpoints.videoGenerate, payload);
      console.log("Proses: Tugas img2img berhasil dibuat.");
      return {
        ...response.data,
        task_id: response.data?.request_id,
        model: model,
        type: payload.generateType,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses img2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async txt2img({
    key,
    prompt
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dari teks...`);
      const payload = {
        prompts: prompt
      };
      const response = await this.api.post(this.config.endpoints.textToImage, payload);
      console.log("Proses: Tugas txt2img berhasil dibuat.");
      if (response.data.imageData) {
        const base64Data = response.data.imageData.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `images/${Date.now()}_image.png`;
        const uploadPayload = {
          fileName: fileName,
          fileData: response.data.imageData,
          mimeType: "image/png"
        };
        const uploadResponse = await this.api.post(this.config.endpoints.uploadR2Flux, uploadPayload);
        if (uploadResponse.data.success) {
          const imageUrl = `https://image.deep-nostalgia-ai.com/${fileName}`;
          return {
            imageUrl: imageUrl,
            key: currentKey
          };
        }
      }
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    task_id,
    model,
    type
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk task_id ${task_id}...`);
      const response = await this.api.get(this.config.endpoints.videoStatus, {
        params: {
          id: task_id,
          model: model,
          type: type
        }
      });
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
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("nostalgia-ai-session-")).map(paste => paste.key);
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
  const api = new DeepNostalgiaAI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "txt2video":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2video'."
          });
        }
        response = await api.txt2video(params);
        break;
      case "img2video":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2video'."
          });
        }
        response = await api.img2video(params);
        break;
      case "img2img":
        if (!params.imageUrl || !params.prompt) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' dan 'prompt' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "status":
        if (!params.task_id || !params.model || !params.type) {
          return res.status(400).json({
            error: "Parameter 'task_id', 'model', dan 'type' wajib diisi untuk action 'status'."
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'txt2video', 'img2video', 'img2img', 'txt2img', 'status', 'list_key', 'del_key'.`
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