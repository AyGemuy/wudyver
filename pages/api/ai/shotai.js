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
import PROMPT from "@/configs/ai-prompt";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const AVAILABLE_MODELS = [{
  model: "veo3.1",
  supportTypes: ["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO"],
  images: {
    max: 2,
    min: 2
  },
  prompt: {
    max: 2e3
  },
  durations: {
    options: [{
      value: "8"
    }]
  },
  aspectRatios: {
    options: [{
      value: "16:9"
    }, {
      value: "9:16"
    }]
  },
  resolutions: {
    options: [{
      value: "720p"
    }]
  }
}, {
  model: "sora-2",
  supportTypes: ["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO"],
  images: {
    max: 1,
    min: 1
  },
  prompt: {
    max: 2e3
  },
  durations: {
    options: [{
      value: "10"
    }, {
      value: "15"
    }]
  },
  aspectRatios: {
    options: [{
      value: "16:9"
    }, {
      value: "9:16"
    }]
  },
  resolutions: {
    options: [{
      value: "720p"
    }]
  }
}, {
  model: "sora-2-pro",
  supportTypes: ["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO"],
  images: {
    max: 1,
    min: 1
  },
  prompt: {
    max: 2e3
  },
  durations: {
    options: [{
      value: "15"
    }, {
      value: "25"
    }]
  },
  aspectRatios: {
    options: [{
      value: "16:9"
    }, {
      value: "9:16"
    }]
  },
  resolutions: {
    options: [{
      value: "1080p"
    }]
  }
}, {
  model: "veo3",
  supportTypes: ["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO"],
  images: {
    max: 1,
    min: 1
  },
  prompt: {
    max: 2e3
  },
  durations: {
    options: [{
      value: "8"
    }]
  },
  aspectRatios: {
    options: [{
      value: "16:9"
    }, {
      value: "9:16"
    }]
  },
  resolutions: {
    options: [{
      value: "720p"
    }]
  }
}, {
  model: "seedance-1-pro",
  supportTypes: ["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO"],
  images: {
    max: 1,
    min: 1
  },
  prompt: {
    max: 2e3
  },
  durations: {
    options: [{
      value: "5"
    }]
  },
  aspectRatios: {
    options: [{
      value: "adaptive"
    }, {
      value: "1:1"
    }, {
      value: "4:3"
    }, {
      value: "3:4"
    }, {
      value: "16:9"
    }, {
      value: "9:16"
    }]
  },
  resolutions: {
    options: [{
      value: "1080p"
    }]
  }
}, {
  model: "gemini-2.5-flash-image",
  supportTypes: ["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE"],
  images: {
    max: 1,
    min: 5
  },
  prompt: {
    max: 1e3
  },
  aspectRatios: {
    options: [{
      value: "auto"
    }, {
      value: "1:1"
    }, {
      value: "4:3"
    }, {
      value: "3:4"
    }, {
      value: "3:2"
    }, {
      value: "2:3"
    }, {
      value: "16:9"
    }, {
      value: "9:16"
    }]
  }
}, {
  model: "seedream-4",
  supportTypes: ["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE"],
  images: {
    max: 1,
    min: 5
  },
  prompt: {
    max: 1e3
  },
  aspectRatios: {
    options: [{
      value: "1:1"
    }, {
      value: "4:3"
    }, {
      value: "3:4"
    }, {
      value: "3:2"
    }, {
      value: "2:3"
    }, {
      value: "16:9"
    }, {
      value: "9:16"
    }]
  }
}, {
  model: "flux-kontext-pro",
  supportTypes: ["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE"],
  images: {
    max: 1,
    min: 5
  },
  prompt: {
    max: 1e3
  },
  aspectRatios: {
    options: [{
      value: "1:1"
    }, {
      value: "4:3"
    }, {
      value: "3:4"
    }, {
      value: "3:2"
    }, {
      value: "2:3"
    }, {
      value: "16:9"
    }, {
      value: "9:16"
    }]
  }
}, {
  model: "gpt-image-1",
  supportTypes: ["TEXT_TO_IMAGE", "IMAGE_TO_IMAGE"],
  images: {
    max: 1,
    min: 5
  },
  prompt: {
    max: 1e3
  },
  aspectRatios: {
    options: [{
      value: "1:1"
    }, {
      value: "3:2"
    }, {
      value: "2:3"
    }]
  }
}];

function findModel(model, type = null) {
  return AVAILABLE_MODELS.find(s => s.model === model && (!type || s.supportTypes.includes(type)));
}

function getDefaultConfig(model, type) {
  const modelData = findModel(model, type);
  if (!modelData) {
    throw Error(`Model ${model} not found`);
  }
  return {
    model: model,
    type: type,
    prompt: "",
    aspectRatio: modelData.aspectRatios.default || modelData.aspectRatios.options?.[0]?.value,
    duration: modelData.durations?.default || modelData.durations?.options?.[0]?.value,
    resolution: modelData.resolutions?.default || modelData.resolutions?.options?.[0]?.value,
    imageUsage: modelData.images?.options?.[0]?.value,
    number: 1
  };
}
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`,
      timeout: 3e4,
      maxRedirects: 5
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
  async checkMessagesShotai(email) {
    try {
      const response = await this.client.get("/mails/v9", {
        params: {
          action: "message",
          email: email
        }
      });
      const content = response.data?.data?.[0]?.text_content;
      if (content) {
        const tokenMatch = content.match(/https:\/\/shotai\.app\/verify-email\?token=([a-zA-Z0-9.\-_]+)/);
        return tokenMatch ? tokenMatch[1] : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesShotai' untuk email ${email}: ${error.message}`);
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
class ShotAIAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://shotai.app/api",
        auth: {
          signUp: "/auth/sign-up/email",
          verifyEmail: "/auth/verify-email",
          signIn: "/auth/sign-in/email",
          getSession: "/auth/get-session"
        },
        generation: {
          image: "/generation/image",
          video: "/generation/video"
        },
        upload: "/upload/image",
        userGenerations: "/user/generations"
      }
    };
    const commonHeaders = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      origin: "https://shotai.app",
      referer: "https://shotai.app/dashboard",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: this.config.endpoints.base,
      jar: this.cookieJar,
      withCredentials: true,
      maxRedirects: 5,
      validateStatus: function(status) {
        return status >= 200 && status < 400;
      },
      headers: {
        ...commonHeaders,
        accept: "*/*",
        "content-type": "application/json"
      }
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _random() {
    return Math.random().toString(36).substring(2, 12);
  }
  _validateModel(model, type = null) {
    const modelData = findModel(model, type);
    if (!modelData) {
      const availableModels = AVAILABLE_MODELS.filter(m => !type || m.supportTypes.includes(type)).map(m => ({
        model: m.model,
        supportTypes: m.supportTypes,
        maxImages: m.images.max,
        minImages: m.images.min,
        aspectRatios: m.aspectRatios.options.map(opt => opt.value),
        durations: m.durations?.options?.map(opt => opt.value) || [],
        resolutions: m.resolutions?.options?.map(opt => opt.value) || []
      }));
      throw {
        error: `Model '${model}' tidak ditemukan${type ? ` untuk tipe '${type}'` : ""}`,
        availableModels: availableModels
      };
    }
    return modelData;
  }
  getAvailableModels(type = null) {
    return AVAILABLE_MODELS.filter(model => !type || model.supportTypes.includes(type)).map(model => ({
      model: model.model,
      supportTypes: model.supportTypes,
      maxImages: model.images.max,
      minImages: model.images.min,
      aspectRatios: model.aspectRatios.options.map(opt => opt.value),
      durations: model.durations?.options?.map(opt => opt.value) || [],
      resolutions: model.resolutions?.options?.map(opt => opt.value) || []
    }));
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.session?.token) throw new Error("Token session tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _verifyAndFollowRedirects(response, operation) {
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      console.log(`Proses: Mengikuti redirect untuk ${operation}...`);
      const redirectUrl = response.headers.location;
      if (redirectUrl) {
        return await this.api.get(redirectUrl);
      }
    }
    return response;
  }
  async _ensureLogin(sessionData) {
    try {
      console.log("Proses: Memastikan login valid...");
      await this.cookieJar.setCookie(`__Secure-better-auth.session_token=${sessionData.session.token}; Domain=.shotai.app; Path=/; Secure; SameSite=Lax`, "https://shotai.app");
      const sessionResponse = await this.api.get(this.config.endpoints.auth.getSession);
      if (sessionResponse.data?.session?.token) {
        console.log("Proses: Session valid, login terkonfirmasi");
        return true;
      }
      console.log("Proses: Session expired, melakukan login ulang...");
      const loginPayload = {
        email: sessionData.email,
        password: sessionData.password,
        rememberMe: true,
        callbackURL: "/dashboard"
      };
      const loginResponse = await this.api.post(this.config.endpoints.auth.signIn, loginPayload);
      await this._verifyAndFollowRedirects(loginResponse, "login");
      const newSessionResponse = await this.api.get(this.config.endpoints.auth.getSession);
      if (!newSessionResponse.data?.session?.token) {
        throw new Error("Login ulang gagal - tidak dapat mendapatkan session token");
      }
      console.log("Proses: Login ulang berhasil");
      return true;
    } catch (error) {
      console.error(`Proses ensure login gagal: ${error.message}`);
      return false;
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI SHOTAI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const name = `User${this._random().substring(0, 8)}`;
    const password = `${this._random()}A1!`;
    const signupPayload = {
      email: email,
      password: password,
      name: name
    };
    console.log("Proses: Melakukan pendaftaran...");
    const signupResponse = await this.api.post(this.config.endpoints.auth.signUp, signupPayload);
    await this._verifyAndFollowRedirects(signupResponse, "signup");
    console.log("Proses: Menunggu email verifikasi...");
    let verificationToken = null;
    for (let i = 0; i < 60; i++) {
      verificationToken = await this.wudysoft.checkMessagesShotai(email);
      if (verificationToken) break;
      console.log(`Proses: Menunggu token verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationToken) throw new Error("Gagal menemukan token verifikasi setelah 3 menit.");
    console.log("Proses: Memverifikasi email...");
    const verifyResponse = await this.api.get(`${this.config.endpoints.auth.verifyEmail}?token=${verificationToken}`);
    await this._verifyAndFollowRedirects(verifyResponse, "email verification");
    console.log("Proses: Melakukan login setelah verifikasi...");
    const loginPayload = {
      email: email,
      password: password,
      rememberMe: true,
      callbackURL: "/dashboard"
    };
    const loginResponse = await this.api.post(this.config.endpoints.auth.signIn, loginPayload);
    await this._verifyAndFollowRedirects(loginResponse, "post-verification login");
    const sessionResponse = await this.api.get(this.config.endpoints.auth.getSession);
    if (!sessionResponse.data?.session?.token) {
      throw new Error("Gagal mendapatkan session token setelah login.");
    }
    console.log("\n[SUCCESS] Registrasi ShotAI berhasil!");
    console.log(`[SESSION] Token: ${sessionResponse.data.session.token.substring(0, 50)}...`);
    console.log(`[USER] ${sessionResponse.data.user.name} (${sessionResponse.data.user.email})`);
    return {
      ...sessionResponse.data,
      email: email,
      password: password
    };
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi ShotAI baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify({
        session: sessionData.session,
        user: sessionData.user,
        email: sessionData.email,
        password: sessionData.password
      });
      const sessionTitle = `shotai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi ShotAI baru.");
      console.log(`-> Sesi ShotAI baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        password: sessionData.password,
        user: sessionData.user
      };
    } catch (error) {
      console.error(`Proses registrasi ShotAI gagal: ${error.message}`);
      throw error;
    }
  }
  async login({
    email,
    password
  }) {
    try {
      console.log(`Proses: Mencoba login ke ShotAI dengan email: ${email}`);
      const loginPayload = {
        email: email,
        password: password,
        rememberMe: true,
        callbackURL: "/dashboard"
      };
      const loginResponse = await this.api.post(this.config.endpoints.auth.signIn, loginPayload);
      await this._verifyAndFollowRedirects(loginResponse, "login");
      const sessionResponse = await this.api.get(this.config.endpoints.auth.getSession);
      if (!sessionResponse.data?.session?.token) {
        throw new Error("Gagal mendapatkan session token setelah login.");
      }
      console.log("Proses: Login ShotAI berhasil.");
      const sessionToSave = JSON.stringify({
        session: sessionResponse.data.session,
        user: sessionResponse.data.user,
        email: email,
        password: password
      });
      const sessionTitle = `shotai-session-${this._random()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi login ke Wudysoft.");
      console.log(`-> Sesi login ShotAI berhasil disimpan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        session: sessionResponse.data.session,
        user: sessionResponse.data.user,
        email: email,
        password: password
      };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses login ShotAI gagal: ${errorMessage}`);
      throw new Error(errorMessage);
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
        console.log("Proses: Memastikan login valid dengan session yang ada...");
        const isLoggedIn = await this._ensureLogin(sessionData);
        if (!isLoggedIn) {
          console.warn("[PERINGATAN] Session tidak valid, mencoba login ulang...");
          throw new Error("Session expired");
        }
      } catch (error) {
        console.warn(`[PERINGATAN] ${error.message}. Mendaftarkan sesi baru...`);
        sessionData = null;
      }
    }
    if (!sessionData) {
      console.log("Proses: Kunci tidak valid atau tidak disediakan, mendaftarkan sesi ShotAI baru...");
      const newSession = await this.register();
      if (!newSession?.key) throw new Error("Gagal mendaftarkan sesi ShotAI baru.");
      console.log(`-> PENTING: Simpan kunci baru ini: ${newSession.key}`);
      currentKey = newSession.key;
      sessionData = await this._getTokenFromKey(currentKey);
      await this._ensureLogin(sessionData);
    }
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async _uploadImage(imageBuffer) {
    try {
      console.log("Proses: Mengunggah gambar ke ShotAI...");
      const formData = new FormData();
      const blob = new Blob([imageBuffer], {
        type: "image/jpeg"
      });
      formData.append("file", blob, `image-${Date.now()}.jpg`);
      const response = await this.api.post(this.config.endpoints.upload, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      if (!response.data?.success) {
        throw new Error("Gagal mengunggah gambar.");
      }
      console.log("Proses: Gambar berhasil diunggah. ID:", response.data.data.id);
      return response.data.data.id;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses unggah gambar gagal: ${errorMessage}`);
      throw error;
    }
  }
  async _processImageInput(imageInput) {
    if (Buffer.isBuffer(imageInput) || typeof imageInput === "string") {
      return [imageInput];
    }
    if (Array.isArray(imageInput)) {
      return imageInput;
    }
    return [imageInput];
  }
  async _uploadMultipleImages(imageInputs) {
    const imageIds = [];
    for (const imageInput of imageInputs) {
      try {
        let imageBuffer;
        if (Buffer.isBuffer(imageInput)) {
          imageBuffer = imageInput;
        } else if (imageInput.startsWith("http")) {
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          imageBuffer = Buffer.from(response.data);
        } else {
          imageBuffer = Buffer.from(imageInput.replace(/^data:image\/\w+;base64,/, ""), "base64");
        }
        const imageId = await this._uploadImage(imageBuffer);
        imageIds.push(imageId);
        console.log(`Proses: Gambar berhasil diunggah (${imageIds.length}/${imageInputs.length})`);
      } catch (error) {
        console.error(`Proses: Gagal mengunggah gambar: ${error.message}`);
        throw error;
      }
    }
    return imageIds;
  }
  async txt2img({
    key,
    prompt,
    model = "gemini-2.5-flash-image",
    aspectRatio = "auto"
  }) {
    try {
      const modelData = this._validateModel(model, "TEXT_TO_IMAGE");
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dari teks dengan model ${model}...`);
      const payload = {
        type: "TEXT_TO_IMAGE",
        prompt: prompt,
        model: model,
        aspectRatio: aspectRatio || modelData.aspectRatios.options[0].value
      };
      const response = await this.api.post(this.config.endpoints.generation.image, payload);
      console.log("Proses: Tugas txt2img berhasil dibuat. ID:", response.data.generation_id);
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      if (error.availableModels) {
        throw error;
      }
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses txt2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2img({
    key,
    prompt = PROMPT.text,
    imageUrl,
    model = "gemini-2.5-flash-image",
    aspectRatio = "auto"
  }) {
    try {
      const modelData = this._validateModel(model, "IMAGE_TO_IMAGE");
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat gambar dari gambar dengan model ${model}...`);
      const imageInputs = await this._processImageInput(imageUrl);
      console.log(`Proses: Mengunggah ${imageInputs.length} gambar...`);
      const imageIds = await this._uploadMultipleImages(imageInputs);
      if (imageIds.length === 0) {
        throw new Error(`Model ${model} membutuhkan minimal 1 gambar`);
      }
      if (imageIds.length > modelData.images.max) {
        throw new Error(`Model ${model} hanya mendukung maksimal ${modelData.images.max} gambar`);
      }
      const payload = {
        type: "IMAGE_TO_IMAGE",
        prompt: prompt,
        model: model,
        aspectRatio: aspectRatio || modelData.aspectRatios.options[0].value,
        imageIds: imageIds
      };
      const response = await this.api.post(this.config.endpoints.generation.image, payload);
      console.log("Proses: Tugas img2img berhasil dibuat. ID:", response.data.generation_id);
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      if (error.availableModels) {
        throw error;
      }
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses img2img gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async txt2vid({
    key,
    prompt,
    imageUrl,
    model = "sora-2",
    aspectRatio = "16:9",
    duration = "10",
    resolution = "720p"
  }) {
    try {
      const modelData = this._validateModel(model, imageUrl ? "IMAGE_TO_VIDEO" : "TEXT_TO_VIDEO");
      const {
        key: currentKey
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Membuat video dari ${imageUrl ? "gambar" : "teks"} dengan model ${model}...`);
      let imageIds = [];
      if (imageUrl) {
        const imageInputs = await this._processImageInput(imageUrl);
        console.log(`Proses: Mengunggah ${imageInputs.length} gambar...`);
        imageIds = await this._uploadMultipleImages(imageInputs);
        if (imageIds.length === 0) {
          throw new Error(`Model ${model} membutuhkan minimal 1 gambar`);
        }
        if (imageIds.length > modelData.images.max) {
          throw new Error(`Model ${model} hanya mendukung maksimal ${modelData.images.max} gambar`);
        }
      }
      const payload = {
        type: imageIds.length > 0 ? "IMAGE_TO_VIDEO" : "TEXT_TO_VIDEO",
        prompt: prompt,
        model: model,
        aspectRatio: aspectRatio || modelData.aspectRatios.options[0].value,
        duration: duration || modelData.durations.options[0].value,
        resolution: resolution || modelData.resolutions.options[0].value,
        imageIds: imageIds,
        imageUsage: ""
      };
      const response = await this.api.post(this.config.endpoints.generation.video, payload);
      console.log("Proses: Tugas video berhasil dibuat. ID:", response.data.generation_id);
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      if (error.availableModels) {
        throw error;
      }
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Proses pembuatan video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2vid({
    key,
    prompt = PROMPT.text,
    imageUrl,
    model = "sora-2",
    aspectRatio = "16:9",
    duration = "10",
    resolution = "720p"
  }) {
    return await this.txt2vid({
      key: key,
      prompt: prompt,
      imageUrl: imageUrl,
      model: model,
      aspectRatio: aspectRatio,
      duration: duration,
      resolution: resolution
    });
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
      console.log(`Proses: Mengecek status untuk task_id ${task_id}...`);
      const response = await this.api.get(`${this.config.endpoints.userGenerations}?ids=${task_id}`);
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
      console.log("Proses: Mengambil daftar semua kunci sesi ShotAI...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("shotai-session-")).map(paste => paste.key);
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new ShotAIAPI();
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
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
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
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' wajib diisi untuk action 'img2vid'."
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
      case "list_models":
        response = api.getAvailableModels(params.type);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'login', 'txt2img', 'img2img', 'txt2vid', 'img2vid', 'list_key', 'del_key', 'status', 'list_models'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    if (error.availableModels) {
      return res.status(400).json({
        error: error.error,
        availableModels: error.availableModels
      });
    }
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}