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
  async checkMessagesHottask(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const urlMatch = content.match(/verify your account\.\]\((https?:\/\/[^\s]+)\)/i);
        if (urlMatch) {
          const url = new URL(urlMatch[1]);
          const token = url.searchParams.get("token");
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesHottask' untuk email ${email}: ${error.message}`);
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
class HotTaskAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://usapi.hottask.com/autodev",
        auth: {
          register: "/User/Register",
          verifyEmail: "/User/VerifyEmail"
        },
        project: {
          getPreUploadUrl: "/ProjectFile/GetPreUploadUrl",
          uploadFile: ""
        },
        tools: {
          generateImage: "/Tools/GenerateImage",
          getRatios: "/Tools/GetRatios"
        },
        chat: {
          ask: "/Chat/Ask",
          getAskStatus: "/Chat/GetAskStatus"
        }
      },
      models: {
        image: {
          "gemini-2.5-flash-image": "Gemini 2.5 Flash Image",
          "dall-e-3": "DALL-E 3",
          "flux-dev": "Flux Dev"
        },
        chat: {
          "gpt-5": "GPT-5",
          "gpt-4": "GPT-4",
          "claude-3-opus": "Claude 3 Opus"
        }
      }
    };
    const commonHeaders = {
      accept: "application/json",
      "accept-language": "id-ID",
      origin: "https://ezsite.ai",
      referer: "https://ezsite.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      clientTimeZone: "Asia/Makassar",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: this.config.endpoints.base,
      jar: this.cookieJar,
      withCredentials: true,
      headers: commonHeaders
    }));
    this.wudysoft = new WudysoftAPI();
    this.authToken = null;
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  _generatePassword() {
    return `AyGemuy${Math.floor(Math.random() * 100)}`;
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.authToken) throw new Error("Auth token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI HOTTASK ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const password = this._generatePassword();
    console.log(`Proses: Password dibuat: ${password}`);
    console.log("Proses: Mendaftarkan akun...");
    const registerPayload = {
      email: email,
      password: password,
      via: ""
    };
    const registerResponse = await this.api.post(this.config.endpoints.auth.register, registerPayload, {
      headers: {
        "content-type": "application/json",
        authorization: "Bearer"
      }
    });
    if (!registerResponse.data.Success) {
      throw new Error(`Registrasi gagal: ${registerResponse.data.Message}`);
    }
    console.log("Proses: Registrasi berhasil, menunggu verifikasi email...");
    let verificationToken = null;
    for (let i = 0; i < 60; i++) {
      verificationToken = await this.wudysoft.checkMessagesHottask(email);
      if (verificationToken) break;
      console.log(`Proses: Menunggu token verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationToken) throw new Error("Gagal menemukan token verifikasi setelah 3 menit.");
    console.log(`Proses: Token verifikasi ditemukan`);
    console.log("Proses: Memverifikasi email...");
    const verifyPayload = {
      email: email,
      token: verificationToken
    };
    const verifyResponse = await this.api.post(this.config.endpoints.auth.verifyEmail, verifyPayload, {
      headers: {
        "content-type": "application/json",
        authorization: "Bearer"
      }
    });
    if (!verifyResponse.data.Success) {
      throw new Error(`Verifikasi email gagal: ${verifyResponse.data.Message}`);
    }
    console.log("Proses: Verifikasi email berhasil");
    const sessionData = {
      authToken: verificationToken,
      email: email,
      password: password
    };
    console.log("\n[SUCCESS] Registrasi HotTask berhasil!");
    return sessionData;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi HotTask baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `hottask-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi HotTask baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        authToken: sessionData.authToken
      };
    } catch (error) {
      console.error(`Proses registrasi HotTask gagal: ${error.message}`);
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
    this.authToken = sessionData.authToken;
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async _downloadImage(imageUrl) {
    try {
      console.log(`Proses: Mengunduh gambar dari: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error(`Gagal mengunduh gambar: ${error.message}`);
      throw error;
    }
  }
  async _uploadImageToS3(preUploadUrl, imageBuffer, filename) {
    try {
      console.log(`Proses: Mengupload gambar ke S3: ${filename}`);
      const response = await axios.put(preUploadUrl, imageBuffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      if (response.status === 200) {
        console.log(`Proses: Upload gambar berhasil: ${filename}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Gagal upload gambar ke S3: ${error.message}`);
      throw error;
    }
  }
  async uploadImage({
    key,
    imageUrl,
    filename = null
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      const finalFilename = filename || `image_${Date.now()}.jpg`;
      console.log(`Proses: Memulai proses upload untuk: ${imageUrl}`);
      console.log("Proses: Mendapatkan pre-upload URL...");
      const preUploadResponse = await this.getPreUploadUrl({
        key: currentKey,
        filename: finalFilename
      });
      const fileStoreId = preUploadResponse.Data?.FileStoreId;
      const preUploadUrl = preUploadResponse.Data?.PreUploadUrl;
      if (!fileStoreId || !preUploadUrl) {
        throw new Error("Gagal mendapatkan pre-upload URL");
      }
      const imageBuffer = await this._downloadImage(imageUrl);
      await this._uploadImageToS3(preUploadUrl, imageBuffer, finalFilename);
      console.log(`Proses: Upload selesai, FileStoreId: ${fileStoreId}`);
      return {
        fileStoreId: fileStoreId,
        filename: finalFilename,
        key: currentKey
      };
    } catch (error) {
      console.error(`Proses upload gambar gagal: ${error.message}`);
      throw error;
    }
  }
  async getPreUploadUrl({
    key,
    filename
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mendapatkan pre-upload URL untuk file: ${filename}`);
      const payload = {
        filename: filename
      };
      const response = await this.api.post(this.config.endpoints.project.getPreUploadUrl, payload, {
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.authToken}`
        }
      });
      if (!response.data.Success) {
        throw new Error(`Gagal mendapatkan pre-upload URL: ${response.data.Message}`);
      }
      console.log("Proses: Pre-upload URL berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`Proses mendapatkan pre-upload URL gagal: ${error.message}`);
      throw error;
    }
  }
  async generateImage({
    key,
    imageIds = [],
    imageUrl = null,
    prompt,
    modelName = "gemini-2.5-flash-image",
    ratio = "1:1"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      let finalImageIds = [...imageIds];
      if (imageUrl) {
        console.log("Proses: Mendeteksi imageUrl, memulai auto upload...");
        const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        const uploadedIds = [];
        for (const url of imageUrls) {
          try {
            const uploadResult = await this.uploadImage({
              key: currentKey,
              imageUrl: url
            });
            uploadedIds.push(uploadResult.fileStoreId);
            console.log(`Proses: Berhasil upload gambar, ID: ${uploadResult.fileStoreId}`);
          } catch (uploadError) {
            console.error(`Gagal upload gambar ${url}:`, uploadError.message);
          }
        }
        finalImageIds = [...finalImageIds, ...uploadedIds];
      }
      if (finalImageIds.length === 0) {
        console.log("Proses: Tidak ada image IDs yang valid, menggunakan array kosong");
      }
      console.log(`Proses: Membuat gambar dengan model ${modelName}...`);
      console.log(`Proses: Menggunakan image IDs:`, finalImageIds);
      const payload = {
        imageIds: finalImageIds,
        prompt: prompt,
        modelName: modelName,
        ratio: ratio
      };
      const response = await this.api.post(this.config.endpoints.tools.generateImage, payload, {
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.authToken}`
        }
      });
      if (!response.data.Success) {
        throw new Error(`Gagal generate image: ${response.data.Message}`);
      }
      console.log("Proses: Generate image berhasil");
      const parsedResponse = {
        result: response.data.Data?.ImageUrl || "",
        id: response.data.Data?.ID || 0,
        time: response.data.Data?.CreateTime || "",
        code: response.data.Code || 200,
        key: currentKey
      };
      return parsedResponse;
    } catch (error) {
      console.error(`Proses generate image gagal: ${error.message}`);
      throw error;
    }
  }
  async getRatios({
    key
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mendapatkan daftar rasio...");
      const response = await this.api.get(this.config.endpoints.tools.getRatios, {
        headers: {
          authorization: `Bearer ${this.authToken}`
        }
      });
      if (!response.data.Success) {
        throw new Error(`Gagal mendapatkan rasio: ${response.data.Message}`);
      }
      console.log("Proses: Daftar rasio berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      console.error(`Proses mendapatkan rasio gagal: ${error.message}`);
      throw error;
    }
  }
  async chatAsk({
    key,
    modelName = "gpt-5",
    projectId,
    question,
    chatAskType = 5,
    isFirstMsg = true,
    promptConfig = {},
    autoGetStatus = true,
    maxStatusChecks = 30
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengirim pertanyaan chat dengan model ${modelName}...`);
      const payload = {
        ModelName: modelName,
        ProjectMode: 0,
        projectId: projectId,
        question: question,
        chatAskType: chatAskType,
        IsFirstMsg: isFirstMsg,
        PromptConfig: promptConfig
      };
      const response = await this.api.post(this.config.endpoints.chat.ask, payload, {
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.authToken}`,
          accept: "text/event-stream"
        }
      });
      console.log("Proses: Pertanyaan chat berhasil dikirim");
      const questionId = response.data?.questionid;
      if (!questionId) {
        throw new Error("Gagal mendapatkan question ID dari response");
      }
      console.log(`Proses: Question ID: ${questionId}`);
      if (autoGetStatus) {
        console.log("Proses: Auto get status diaktifkan, menunggu hasil...");
        return await this._waitForChatCompletion({
          key: currentKey,
          projectId: projectId,
          questionId: questionId,
          maxStatusChecks: maxStatusChecks
        });
      }
      return {
        ...response.data,
        key: currentKey,
        questionId: questionId
      };
    } catch (error) {
      console.error(`Proses chat ask gagal: ${error.message}`);
      throw error;
    }
  }
  async _waitForChatCompletion({
    key,
    projectId,
    questionId,
    maxStatusChecks = 30,
    checkInterval = 2e3
  }) {
    console.log(`Proses: Menunggu chat completion untuk questionId: ${questionId}`);
    for (let i = 0; i < maxStatusChecks; i++) {
      try {
        const status = await this.getChatStatus({
          key: key,
          projectId: projectId,
          questionId: questionId
        });
        console.log(`Proses: Status check ${i + 1}/${maxStatusChecks} - TaskCompleted: ${status.taskCompleted}`);
        if (status.taskCompleted) {
          console.log("Proses: Chat completed, mengembalikan hasil...");
          return {
            ...status,
            key: key,
            questionId: questionId
          };
        }
        if (i < maxStatusChecks - 1) {
          console.log(`Proses: Menunggu ${checkInterval / 1e3} detik...`);
          await sleep(checkInterval);
        }
      } catch (error) {
        console.error(`Error saat mengecek status: ${error.message}`);
      }
    }
    throw new Error(`Timeout: Chat tidak selesai setelah ${maxStatusChecks} percobaan`);
  }
  async getChatStatus({
    key,
    projectId,
    questionId
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status chat untuk questionId ${questionId}...`);
      const payload = {
        projectId: projectId,
        questionId: questionId
      };
      const response = await this.api.post(this.config.endpoints.chat.getAskStatus, payload, {
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.authToken}`
        }
      });
      if (!response.data.Success) {
        throw new Error(`Gagal mendapatkan status chat: ${response.data.Message}`);
      }
      console.log("Proses: Status chat berhasil didapatkan");
      const parsedResponse = {
        result: response.data.Data?.Content || "",
        plan: response.data.Data?.Plan || {},
        token: response.data.Data?.TotalToken || 0,
        code: response.data.Code || 200,
        taskCompleted: response.data.Data?.TaskCompleted || false,
        status: response.data.Data?.Status || "",
        key: currentKey
      };
      return parsedResponse;
    } catch (error) {
      console.error(`Proses mendapatkan status chat gagal: ${error.message}`);
      throw error;
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi HotTask...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("hottask-session-")).map(paste => paste.key);
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
  const api = new HotTaskAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "upload":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'upload'."
          });
        }
        response = await api.uploadImage(params);
        break;
      case "pre_upload":
        if (!params.filename) {
          return res.status(400).json({
            error: "Parameter 'filename' wajib diisi untuk action 'pre_upload'."
          });
        }
        response = await api.getPreUploadUrl(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'image'."
          });
        }
        response = await api.generateImage(params);
        break;
      case "ratio":
        response = await api.getRatios(params);
        break;
      case "chat":
        if (!params.projectId || !params.question) {
          return res.status(400).json({
            error: "Parameter 'projectId' dan 'question' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chatAsk(params);
        break;
      case "chat_status":
        if (!params.projectId || !params.questionId) {
          return res.status(400).json({
            error: "Parameter 'projectId' dan 'questionId' wajib diisi untuk action 'chat_status'."
          });
        }
        response = await api.getChatStatus(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'upload', 'pre_upload', 'image', 'ratio', 'chat', 'chat_status', 'list_key', 'del_key'.`
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