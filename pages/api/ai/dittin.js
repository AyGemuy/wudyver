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
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function base64URLEncode(str) {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest();
}
async function logCookies(jar, url, label) {
  try {
    const cookies = await jar.getCookies(url);
    console.log(`\n[COOKIES ${label}] URL: ${url}`);
    if (cookies.length === 0) {
      console.log("  - (Tidak ada cookie)");
      return;
    }
    cookies.forEach(c => {
      const valuePreview = c.value ? c.value.substring(0, 80) : "(null)";
      const ellipsis = c.value && c.value.length > 80 ? "..." : "";
      console.log(`  - ${c.key} = ${valuePreview}${ellipsis}`);
    });
  } catch (e) {
    console.error(`Gagal membaca cookie untuk ${url}: ${e.message}`);
  }
}
async function followRedirects(client, url, headers, maxRedirects = 10) {
  let currentUrl = url;
  let redirectCount = 0;
  while (redirectCount < maxRedirects) {
    console.log(`\n[REQUEST ${redirectCount + 1}] ${currentUrl}`);
    let response;
    try {
      response = await client.get(currentUrl, {
        headers: headers,
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
    } catch (error) {
      if (error.response) {
        response = error.response;
      } else {
        throw error;
      }
    }
    console.log(`[RESPONSE ${redirectCount + 1}] Status: ${response.status}`);
    await logCookies(client.defaults.jar, currentUrl, `after req ${redirectCount + 1}`);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) {
        throw new Error(`Status ${response.status} redirect tanpa header location.`);
      }
      const nextUrl = new URL(location, currentUrl);
      console.log(`[REDIRECT ${redirectCount + 1}] -> ${nextUrl.href}`);
      currentUrl = nextUrl.href;
      redirectCount++;
    } else {
      return {
        finalUrl: currentUrl
      };
    }
  }
  throw new Error(`Terlalu banyak redirect (melebihi ${maxRedirects})`);
}
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
  async checkMessagesDittin(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/\n\n([0-9]{6})\n\n/);
        return match ? match[1] : null;
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
class DittinAIAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://dittin.ai/api",
        auth: "/auth/email",
        user: "/user",
        generator: "/generator",
        chatbot: "/chatbot",
        chat: "/chat",
        upload: "/upload"
      },
      models: {
        Anime: "Anime"
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://dittin.ai",
      referer: "https://dittin.ai/",
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
        accept: "application/json",
        "content-type": "application/json",
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
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.accessToken) throw new Error("Token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
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
    this.api.defaults.headers.common["authorization"] = `Bearer ${sessionData.accessToken}`;
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async register() {
    try {
      console.log("\n====== MEMULAI PROSES REGISTRASI ======");
      const email = await this.wudysoft.createEmail();
      if (!email) throw new Error("Gagal membuat email sementara.");
      console.log(`Proses: Email dibuat: ${email}`);
      const sendCodePayload = {
        action: "sendVerificationCode",
        data: {
          type: "signup",
          email: email,
          password: "",
          verificationCode: "",
          confirmPassword: ""
        }
      };
      await this.api.post(this.config.endpoints.auth, sendCodePayload);
      console.log("Proses: Kode verifikasi dikirim, menunggu kode...");
      let verificationCode = null;
      for (let i = 0; i < 60; i++) {
        verificationCode = await this.wudysoft.checkMessagesDittin(email);
        if (verificationCode) break;
        console.log(`Proses: Menunggu kode verifikasi... (${i + 1}/60)`);
        await sleep(3e3);
      }
      if (!verificationCode) throw new Error("Gagal menemukan kode verifikasi setelah 3 menit.");
      console.log("Proses: Kode verifikasi ditemukan:", verificationCode);
      const password = `AyGemuy${this._random()}`;
      const signupPayload = {
        action: "signup",
        data: {
          email: email,
          verificationCode: verificationCode,
          password: password,
          confirmPassword: password,
          userSource: {
            referringDomain: "https://thatsmy.ai/",
            initialCurrentUrl: "https://dittin.ai/?utm_source=thatsmyai&utm_medium=cpc&utm_campaign=reftraffic&utm_id=ThatsMyAI"
          }
        }
      };
      const response = await this.api.post(this.config.endpoints.auth, signupPayload);
      const sessionData = response.data;
      if (!sessionData.accessToken) throw new Error("Gagal mendapatkan access token dari signup.");
      console.log("\n[SUCCESS] Registrasi berhasil!");
      console.log(`[TOKEN] ${sessionData.accessToken.substring(0, 50)}...`);
      const sessionToSave = JSON.stringify({
        accessToken: sessionData.accessToken,
        email: email,
        password: password
      });
      const sessionTitle = `dittinai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: email,
        password: password
      };
    } catch (error) {
      console.error(`Proses registrasi gagal: ${error.message}`);
      throw error;
    }
  }
  async login({
    email,
    password
  }) {
    try {
      console.log(`Proses: Mencoba login dengan email: ${email}`);
      const loginPayload = {
        action: "login",
        data: {
          email: email,
          password: password
        }
      };
      const response = await this.api.post(this.config.endpoints.auth, loginPayload);
      const sessionData = response.data;
      if (!sessionData.accessToken) throw new Error("Gagal mendapatkan access token dari login.");
      console.log("Proses: Login berhasil.");
      const sessionToSave = JSON.stringify({
        accessToken: sessionData.accessToken,
        email: email,
        password: password
      });
      const sessionTitle = `dittinai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi login ke Wudysoft.");
      console.log(`-> Sesi login berhasil disimpan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        accessToken: sessionData.accessToken,
        email: email,
        password: password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses login gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("dittinai-session-")).map(paste => paste.key);
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
  async user_info({
    key
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mendapatkan info user...");
      const payload = {
        action: "getUserInfo"
      };
      const response = await this.api.post(this.config.endpoints.user, payload);
      console.log("Proses: Info user berhasil didapatkan.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses user_info gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async image_gen({
    key,
    prompt,
    negativePrompt = "",
    model = "Anime",
    aspectRatio = "4:3",
    numberOfImages = 1,
    isAutoEnhancePrompts = true
  }) {
    if (!this.config.models[model]) throw new Error(`Model "${model}" tidak valid.`);
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Generate image dengan model ${model}...`);
      const payload = {
        action: "generateImage",
        data: {
          selectedModelName: model,
          imagePrompt: prompt,
          negativePrompt: negativePrompt,
          isAutoEnhancePrompts: isAutoEnhancePrompts,
          aspectRatio: aspectRatio,
          numberOfImages: numberOfImages
        }
      };
      const response = await this.api.post(this.config.endpoints.generator, payload);
      console.log("Proses: Tugas image_gen berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses image_gen gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    taskId
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk taskId ${taskId}...`);
      const payload = {
        action: "checkImageTask",
        data: {
          taskId: taskId
        }
      };
      const response = await this.api.post(this.config.endpoints.generator, payload);
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
  async search({
    key,
    keyword = "",
    category = "new",
    gender = "all",
    currentPage = 1,
    pageSize = 48,
    locale = "en"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mencari chatbot dengan keyword "${keyword}"...`);
      const payload = {
        action: "getPublicChatbots",
        data: {
          currentPage: currentPage,
          pageSize: pageSize,
          category: category,
          gender: gender,
          searchKeyword: keyword,
          locale: locale
        }
      };
      const response = await this.api.post(this.config.endpoints.chatbot, payload);
      console.log("Proses: Pencarian berhasil.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses search gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async start_chat({
    key,
    chatbotId,
    locale = "en"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mendapatkan chatbot dengan ID ${chatbotId}...`);
      const payload = {
        action: "getChatbotById",
        data: {
          chatbotId: chatbotId,
          locale: locale
        }
      };
      const response = await this.api.post(this.config.endpoints.chatbot, payload);
      console.log("Proses: Chatbot berhasil didapatkan.");
      const chatPayload = {
        action: "startNewChat",
        data: {
          chatbotId: chatbotId
        }
      };
      const chatResponse = await this.api.post(this.config.endpoints.chat, chatPayload);
      console.log("Proses: Chat baru dimulai secara otomatis.");
      return {
        chatbot: response.data,
        chatListId: chatResponse.data.chatListId,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses chat gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async send_message({
    key,
    chatListId,
    message
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengirim pesan ke chatListId ${chatListId}...`);
      const payload = {
        action: "sendMessage",
        data: {
          chatListId: chatListId,
          message: message
        }
      };
      const response = await this.api.post(this.config.endpoints.chat, payload);
      console.log("Proses: Pesan berhasil dikirim.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses send_message gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async chat_image({
    key,
    chatListId,
    imagePrompt = "selfie",
    negativePrompt = "",
    model = "Anime",
    aspectRatio = "4:3",
    isAutoEnhancePrompts = true
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Generate image untuk chatListId ${chatListId}...`);
      const payload = {
        action: "generateConversationImage",
        data: {
          imageOptions: {
            imagePrompt: imagePrompt,
            negativePrompt: negativePrompt,
            selectedModelName: model,
            aspectRatio: aspectRatio,
            isAutoEnhancePrompts: isAutoEnhancePrompts
          },
          chatListId: chatListId
        }
      };
      const response = await this.api.post(this.config.endpoints.chat, payload);
      console.log("Proses: Tugas chat_image berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses chat_image gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async _uploadImage(imageBuffer, filename = "image.png") {
    try {
      console.log("Proses: Mengunggah gambar untuk video_gen...");
      const formData = new FormData();
      formData.append("image", imageBuffer, {
        filename: filename,
        contentType: "image/png"
      });
      const response = await this.api.post(this.config.endpoints.upload, formData, {
        headers: {
          ...formData.getHeaders(),
          accept: "application/json"
        }
      });
      console.log("Proses: Gambar berhasil diunggah.");
      return response.data.url;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses unggah gambar gagal: ${errorMessage}`);
      throw error;
    }
  }
  async _processImageInput(imageInput) {
    try {
      if (Buffer.isBuffer(imageInput)) {
        console.log("Proses: Input adalah Buffer");
        return imageInput;
      } else if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          console.log("Proses: Input adalah URL, mendownload gambar...");
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          return Buffer.from(response.data);
        } else if (imageInput.startsWith("data:")) {
          console.log("Proses: Input adalah Base64 data URL");
          const base64Data = imageInput.split(",")[1];
          return Buffer.from(base64Data, "base64");
        } else {
          console.log("Proses: Input adalah Base64 string");
          return Buffer.from(imageInput, "base64");
        }
      } else {
        throw new Error("Format imageUrl tidak didukung. Gunakan URL, Base64, atau Buffer.");
      }
    } catch (error) {
      console.error(`Gagal memproses input gambar: ${error.message}`);
      throw new Error(`Gagal memproses input gambar: ${error.message}`);
    }
  }
  async video_gen({
    key,
    imageUrl,
    prompt = "Dancing",
    resolution = "480p"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Generate video...");
      const imageBuffer = await this._processImageInput(imageUrl);
      const uploadedUrl = await this._uploadImage(imageBuffer);
      const payload = {
        action: "generateAnimateImage",
        data: {
          animateOptions: {
            imageUrl: uploadedUrl,
            prompt: prompt,
            resolution: resolution
          }
        }
      };
      const response = await this.api.post(this.config.endpoints.chat, payload);
      console.log("Proses: Tugas video_gen berhasil dibuat.");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses video_gen gagal: ${errorMessage}`);
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
  const api = new DittinAIAPI();
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
      case "user_info":
        response = await api.user_info(params);
        break;
      case "image_gen":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'image_gen'."
          });
        }
        response = await api.image_gen(params);
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Paramenter 'taskId' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "search":
        response = await api.search(params);
        break;
      case "start_chat":
        if (!params.chatbotId) {
          return res.status(400).json({
            error: "Paramenter 'chatbotId' wajib diisi untuk action 'start_chat'."
          });
        }
        response = await api.start_chat(params);
        break;
      case "chat_image":
        if (!params.chatListId) {
          return res.status(400).json({
            error: "Paramenter 'chatListId' wajib diisi untuk action 'chat_image'."
          });
        }
        response = await api.chat_image(params);
        break;
      case "send_message":
        if (!params.chatListId) {
          return res.status(400).json({
            error: "Paramenter 'chatListId' wajib diisi untuk action 'send_message'."
          });
        }
        response = await api.send_message(params);
        break;
      case "video_gen":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' wajib diisi untuk action 'video_gen'."
          });
        }
        response = await api.video_gen(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'user_info', 'image_gen', 'status', 'search', 'start_chat', 'chat_image', 'video_gen', 'list_key', 'del_key'.`
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