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
  async checkMessagesYolly(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const match = content.match(/(\d{6})/);
        return match ? match[0] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesYolly' untuk email ${email}: ${error.message}`);
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
class YollyAIAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://www.yolly.ai/api",
        auth: {
          sendCode: "/auth/send-code",
          csrf: "/auth/csrf",
          callback: "/auth/callback/verification-code",
          firstVisit: "/user/first-visit",
          credits: "/get-user-credits"
        },
        video: {
          create: "/video/create",
          query: "/video/query"
        },
        image: {
          create: "/image/create",
          query: "/image/query",
          upload: "/upload/image/presigned-url"
        },
        lyrics: {
          create: "/lyrics/create",
          status: "/lyrics/status"
        },
        music: {
          create: "/music/create",
          status: "/music/status"
        }
      },
      models: {
        video: {
          "sora-2": {
            name: "sora-2",
            resolutions: ["1080p"],
            durations: ["10"],
            aspectRatios: ["16:9"]
          }
        },
        image: {
          "nano-banana": {
            name: "nano-banana",
            aspectRatios: ["auto", "1:1", "16:9", "9:16"]
          }
        },
        music: {
          V5: {
            name: "V5"
          }
        }
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      origin: "https://www.yolly.ai",
      referer: "https://www.yolly.ai/",
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
  async _processImageInputForVideo(imageInput) {
    if (Array.isArray(imageInput)) {
      return await Promise.all(imageInput.map(img => this._processSingleImageForVideo(img)));
    }
    return [await this._processSingleImageForVideo(imageInput)];
  }
  async _processSingleImageForVideo(imageInput) {
    try {
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          console.log("Proses: Mengonversi URL gambar ke base64 untuk video...");
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          const base64 = Buffer.from(response.data).toString("base64");
          const contentType = response.headers["content-type"] || "image/jpeg";
          return `data:${contentType};base64,${base64}`;
        } else if (imageInput.startsWith("data:")) {
          return imageInput;
        } else {
          return `data:image/jpeg;base64,${imageInput}`;
        }
      } else if (Buffer.isBuffer(imageInput)) {
        const base64 = imageInput.toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      }
      throw new Error("Format gambar tidak didukung untuk video");
    } catch (error) {
      console.error("Error processing image for video:", error);
      throw error;
    }
  }
  async _processImageInputForImage(imageInput) {
    if (Array.isArray(imageInput)) {
      return await Promise.all(imageInput.map(img => this._processSingleImageForImage(img)));
    }
    return [await this._processSingleImageForImage(imageInput)];
  }
  async _processSingleImageForImage(imageInput) {
    try {
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          return imageInput;
        } else if (imageInput.startsWith("data:")) {
          return await this._uploadBase64Image(imageInput);
        } else {
          return await this._uploadBase64Image(`data:image/jpeg;base64,${imageInput}`);
        }
      } else if (Buffer.isBuffer(imageInput)) {
        const base64 = imageInput.toString("base64");
        return await this._uploadBase64Image(`data:image/jpeg;base64,${base64}`);
      }
      throw new Error("Format gambar tidak didukung untuk image generation");
    } catch (error) {
      console.error("Error processing image for image generation:", error);
      throw error;
    }
  }
  async _uploadBase64Image(base64Data) {
    try {
      const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error("Invalid base64 data URI");
      }
      const contentType = matches[1];
      const base64String = matches[2];
      const buffer = Buffer.from(base64String, "base64");
      const filename = `image-${Date.now()}-${this._random()}.${contentType.split("/")[1] || "jpg"}`;
      const presignResponse = await this.api.post(this.config.endpoints.image.upload, {
        filename: filename,
        contentType: contentType
      });
      if (presignResponse.data.code !== 0) {
        throw new Error(presignResponse.data.message || "Failed to get upload URL");
      }
      const {
        uploadUrl,
        url
      } = presignResponse.data.data;
      const uploadClient = axios.create();
      await uploadClient.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": contentType
        }
      });
      console.log(`Proses: Gambar berhasil diunggah ke: ${url}`);
      return url;
    } catch (error) {
      console.error("Error uploading base64 image:", error);
      throw error;
    }
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.sessionToken) throw new Error("Session token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI YOLLY AI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    console.log("Proses: Mendapatkan CSRF token...");
    const csrfResponse = await this.api.get(this.config.endpoints.auth.csrf, {
      headers: {
        "content-type": "application/json"
      }
    });
    const csrfToken = csrfResponse.data?.csrfToken;
    if (!csrfToken) throw new Error("Gagal mendapatkan CSRF token");
    console.log("Proses: CSRF token didapatkan");
    console.log("Proses: Mengirim kode verifikasi...");
    await this.api.post(this.config.endpoints.auth.sendCode, {
      email: email
    }, {
      headers: {
        "content-type": "application/json"
      }
    });
    console.log("Proses: Menunggu kode verifikasi...");
    let verificationCode = null;
    for (let i = 0; i < 60; i++) {
      verificationCode = await this.wudysoft.checkMessagesYolly(email);
      if (verificationCode) break;
      console.log(`Proses: Menunggu kode verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationCode) throw new Error("Gagal menemukan kode verifikasi setelah 3 menit.");
    console.log(`Proses: Kode verifikasi ditemukan: ${verificationCode}`);
    console.log("Proses: Memverifikasi kode...");
    const callbackResponse = await this.api.post(`${this.config.endpoints.auth.callback}?`, `email=${encodeURIComponent(email)}&code=${verificationCode}&firstVisitPage=%2Fsora2&redirect=false&callbackUrl=https%3A%2F%2Fwww.yolly.ai%2Fsora2&csrfToken=${encodeURIComponent(csrfToken)}`, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-auth-return-redirect": "1"
      }
    });
    console.log("Proses: Melakukan first visit...");
    await this.api.post(this.config.endpoints.auth.firstVisit, {
      firstVisitPage: "/sora2",
      deviceType: "mobile",
      referrerInfo: {
        referrer: null,
        referrerDomain: null,
        trafficSource: "direct",
        sourceName: "direct",
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null
      }
    }, {
      headers: {
        "content-type": "application/json"
      }
    });
    console.log("Proses: Memverifikasi login...");
    const creditsResponse = await this.api.post(this.config.endpoints.auth.credits, {}, {
      headers: {
        "content-type": "application/json"
      }
    });
    const cookies = await this.cookieJar.getCookies("https://www.yolly.ai");
    const sessionCookie = cookies.find(cookie => cookie.key === "__Secure-authjs.session-token");
    if (!sessionCookie?.value) {
      throw new Error("Gagal mendapatkan session token setelah login.");
    }
    const sessionData = {
      sessionToken: sessionCookie.value,
      email: email,
      credits: creditsResponse.data
    };
    console.log("\n[SUCCESS] Registrasi Yolly AI berhasil!");
    return sessionData;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi Yolly AI baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `yollyai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi Yolly AI baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        credits: sessionData.credits
      };
    } catch (error) {
      console.error(`Proses registrasi Yolly AI gagal: ${error.message}`);
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
    await this.cookieJar.setCookie(`__Secure-authjs.session-token=${sessionData.sessionToken}; Domain=.yolly.ai; Path=/; Secure; SameSite=Lax`, "https://www.yolly.ai");
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async lyrics({
    key,
    prompt
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat lirik dengan prompt: ${prompt}`);
      const response = await this.api.post(this.config.endpoints.lyrics.create, {
        prompt: prompt
      });
      console.log("Proses: Permintaan lirik berhasil dibuat");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pembuatan lirik gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async image({
    key,
    prompt,
    model = "nano-banana",
    referenceImages = [],
    aspectRatio = "auto",
    numberOfImages = 1,
    activeTab = "image"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dengan model ${model}...`);
      const processedReferenceImages = referenceImages.length > 0 ? await this._processImageInputForImage(referenceImages) : [];
      const payload = {
        model: model,
        prompt: prompt,
        referenceImages: processedReferenceImages,
        aspectRatio: aspectRatio,
        numberOfImages: numberOfImages,
        activeTab: activeTab,
        isPublic: true
      };
      console.log("Proses: Payload untuk image generation:", {
        model: payload.model,
        prompt: payload.prompt.substring(0, 50) + "...",
        referenceImagesCount: payload.referenceImages.length,
        aspectRatio: payload.aspectRatio
      });
      const response = await this.api.post(this.config.endpoints.image.create, payload);
      console.log("Proses: Permintaan gambar berhasil dibuat");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pembuatan gambar gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async video({
    key,
    prompt,
    model = "sora-2",
    images = [],
    inputMode = "text",
    resolution = "1080p",
    duration = "10",
    aspectRatio = "16:9",
    negativePrompt = "",
    audioUrl = "",
    enablePromptExpansion = false,
    cameraFixed = false,
    cfgScale = .5
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dengan model ${model}...`);
      const processedImages = images.length > 0 ? await this._processImageInputForVideo(images) : [];
      const payload = {
        model: model,
        prompt: prompt,
        images: processedImages,
        inputMode: inputMode,
        isPublic: true,
        resolution: resolution,
        duration: duration,
        aspectRatio: aspectRatio,
        negativePrompt: negativePrompt,
        audioUrl: audioUrl,
        enablePromptExpansion: enablePromptExpansion,
        cameraFixed: cameraFixed,
        cfgScale: cfgScale
      };
      console.log("Proses: Payload untuk video generation:", {
        model: payload.model,
        prompt: payload.prompt.substring(0, 50) + "...",
        imagesCount: payload.images.length,
        inputMode: payload.inputMode,
        resolution: payload.resolution
      });
      const response = await this.api.post(this.config.endpoints.video.create, payload);
      console.log("Proses: Permintaan video berhasil dibuat");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pembuatan video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async music({
    key,
    prompt,
    customMode = false,
    instrumental = false,
    model = "V5",
    style = "",
    title = ""
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat musik dengan model ${model}...`);
      const payload = {
        prompt: prompt,
        customMode: customMode,
        instrumental: instrumental,
        model: model
      };
      if (style) payload.style = style;
      if (title) payload.title = title;
      console.log("Proses: Payload untuk music generation:", {
        model: payload.model,
        prompt: payload.prompt.substring(0, 50) + "...",
        customMode: payload.customMode,
        instrumental: payload.instrumental
      });
      const response = await this.api.post(this.config.endpoints.music.create, payload);
      console.log("Proses: Permintaan musik berhasil dibuat");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pembuatan musik gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    taskId,
    type = "video"
  }) {
    try {
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status untuk taskId ${taskId} (type: ${type})...`);
      let endpoint;
      switch (type) {
        case "video":
          endpoint = `${this.config.endpoints.video.query}?id=${taskId}&provider=sora2`;
          break;
        case "image":
          endpoint = `${this.config.endpoints.image.query}?id=${taskId}`;
          break;
        case "lyrics":
          endpoint = `${this.config.endpoints.lyrics.status}?taskId=${taskId}`;
          break;
        case "music":
          endpoint = `${this.config.endpoints.music.status}?taskId=${taskId}`;
          break;
        default:
          throw new Error(`Tipe status tidak valid: ${type}`);
      }
      const response = await this.api.get(endpoint);
      console.log("Proses: Status berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pengecekan status gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi Yolly AI...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("yollyai-session-")).map(paste => paste.key);
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
  const api = new YollyAIAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'lyrics'."
          });
        }
        response = await api.lyrics(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'image'."
          });
        }
        response = await api.image(params);
        break;
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'video'."
          });
        }
        response = await api.video(params);
        break;
      case "music":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'music'."
          });
        }
        response = await api.music(params);
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' wajib diisi untuk action 'status'."
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'lyrics', 'image', 'video', 'music', 'status', 'list_key', 'del_key'.`
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