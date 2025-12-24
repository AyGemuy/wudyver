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
  async checkMessagesDigen(email) {
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
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesDigen' untuk email ${email}: ${error.message}`);
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
class DigenAIAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      endpoints: {
        base: "https://api.digen.ai",
        auth: {
          sendCode: "/v1/user/send_code",
          verifyCode: "/v1/user/verify_code",
          register: "/v1/user/register",
          profile: "/v1/user/profile"
        },
        credit: {
          reward: "/v1/credit/reward"
        },
        tools: {
          upload: "/v1/tools/upload",
          textToImage: "/v2/tools/text_to_image"
        },
        element: {
          presign: "/v1/element/priv/presign",
          sync: "/v1/element/priv/sync"
        },
        scene: {
          submit: "/v1/scene/job/submitv1"
        },
        video: {
          list: "/v3/video/job/list",
          getTask: "/v6/video/get_task_v2"
        }
      },
      models: {
        image: {
          image_motion: {
            name: "image_motion",
            resolutions: ["640x640", "880x1176"],
            aspectRatios: ["1:1", "3:4"]
          }
        },
        video: {
          wan: {
            name: "wan",
            engines: ["sora2"],
            aspectRatios: ["portrait", "landscape", "square"],
            durations: ["10"]
          }
        }
      }
    };
    this.deviceId = this._generateRandomDeviceId();
    this.sessionId = this._generateSessionId();
    this.defaultHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      "digen-appversion": "v0.0.47 (211034.1)",
      "digen-deviceid": this.deviceId,
      "digen-language": "id-ID",
      "digen-platform": "web",
      "digen-systemtype": "Android",
      "digen-systemversion": "10",
      origin: "https://digen.ai",
      priority: "u=1, i",
      referer: "https://digen.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = wrapper(axios.create({
      baseURL: "https://api.digen.ai",
      jar: this.cookieJar,
      withCredentials: true,
      headers: this.defaultHeaders
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _generateRandomDeviceId() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 12);
    return `web_${timestamp}_${randomStr}`;
  }
  _generateRandomPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  _generateSessionId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  _updateHeaders(token = null) {
    const headers = {
      ...this.defaultHeaders,
      "digen-sessionid": this.sessionId,
      "digen-deviceid": this.deviceId
    };
    if (token) {
      headers["digen-token"] = token;
      const existingCookies = headers["cookie"] || "";
      headers["cookie"] = `${existingCookies}${existingCookies ? "; " : ""}digen_token=${token}`;
    }
    return headers;
  }
  async _uploadImageViaToolsUpload(imageInput) {
    try {
      let buffer;
      let contentType = "image/jpeg";
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(response.data);
          contentType = response.headers["content-type"] || "image/jpeg";
        } else if (imageInput.startsWith("data:")) {
          const matches = imageInput.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
          if (!matches) throw new Error("Invalid base64 data URI");
          contentType = matches[1];
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(imageInput, "base64");
        }
      } else if (Buffer.isBuffer(imageInput)) {
        buffer = imageInput;
      } else {
        throw new Error("Format gambar tidak didukung");
      }
      const formData = new FormData();
      formData.append("format", "jpeg");
      formData.append("file", buffer, {
        filename: `image-${Date.now()}.jpg`,
        contentType: contentType
      });
      formData.append("location", "main");
      const response = await this.api.post(this.config.endpoints.tools.upload, formData, {
        headers: {
          ...this._updateHeaders(),
          "content-type": `multipart/form-data; boundary=${formData.getBoundary()}`
        }
      });
      if (response.data.errCode !== 0) {
        throw new Error(response.data.errMsg || "Failed to upload image");
      }
      return response.data.data.imageUrlV1 || response.data.data.imageUrl;
    } catch (error) {
      console.error("Error uploading image via tools/upload:", error);
      throw error;
    }
  }
  async _uploadImageViaPresign(imageInput) {
    try {
      let buffer;
      let contentType = "image/jpeg";
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(response.data);
          contentType = response.headers["content-type"] || "image/jpeg";
        } else if (imageInput.startsWith("data:")) {
          const matches = imageInput.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
          if (!matches) throw new Error("Invalid base64 data URI");
          contentType = matches[1];
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(imageInput, "base64");
        }
      } else if (Buffer.isBuffer(imageInput)) {
        buffer = imageInput;
      } else {
        throw new Error("Format gambar tidak didukung");
      }
      const presignResponse = await this.api.get(this.config.endpoints.element.presign, {
        params: {
          format: "jpeg"
        },
        headers: this._updateHeaders()
      });
      if (presignResponse.data.errCode !== 0) {
        throw new Error(presignResponse.data.errMsg || "Failed to get presign URL");
      }
      const presignUrl = presignResponse.data.data.url;
      await axios.put(presignUrl, buffer, {
        headers: {
          "Content-Type": contentType
        }
      });
      const syncResponse = await this.api.post(this.config.endpoints.element.sync, {
        url: presignUrl,
        thumbnail: presignUrl,
        fileName: `image-${Date.now()}.jpg`
      }, {
        headers: this._updateHeaders()
      });
      if (syncResponse.data.errCode !== 0) {
        throw new Error(syncResponse.data.errMsg || "Failed to sync image");
      }
      return syncResponse.data.data.url;
    } catch (error) {
      console.error("Error uploading image via presign:", error);
      throw error;
    }
  }
  async _processImageInput(imageInput, usePresign = false) {
    try {
      if (usePresign) {
        return await this._uploadImageViaPresign(imageInput);
      } else {
        return await this._uploadImageViaToolsUpload(imageInput);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  }
  async _getTokenFromKey(key) {
    console.log(`Proses: Memuat sesi dari kunci: ${key}`);
    const savedSession = await this.wudysoft.getPaste(key);
    if (!savedSession) throw new Error(`Sesi dengan kunci "${key}" tidak ditemukan.`);
    try {
      const sessionData = JSON.parse(savedSession);
      if (!sessionData.token) throw new Error("Token tidak valid dalam sesi tersimpan.");
      console.log("Proses: Sesi berhasil dimuat.");
      return sessionData;
    } catch (e) {
      throw new Error(`Gagal memuat sesi: ${e.message}`);
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI DIGEN AI ======");
    const email = await this.wudysoft.createEmail();
    if (!email) throw new Error("Gagal membuat email sementara.");
    console.log(`Proses: Email dibuat: ${email}`);
    const password = this._generateRandomPassword();
    console.log(`Proses: Password acak dibuat: ${password}`);
    console.log("Proses: Mengirim kode verifikasi...");
    const sendCodeResponse = await this.api.post(this.config.endpoints.auth.sendCode, {
      email: email
    }, {
      headers: this._updateHeaders()
    });
    if (sendCodeResponse.data.errCode !== 0) {
      throw new Error("Gagal mengirim kode verifikasi: " + sendCodeResponse.data.errMsg);
    }
    console.log("Proses: Menunggu kode verifikasi...");
    let verificationCode = null;
    for (let i = 0; i < 60; i++) {
      verificationCode = await this.wudysoft.checkMessagesDigen(email);
      if (verificationCode) break;
      console.log(`Proses: Menunggu kode verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationCode) throw new Error("Gagal menemukan kode verifikasi setelah 3 menit.");
    console.log(`Proses: Kode verifikasi ditemukan: ${verificationCode}`);
    console.log("Proses: Memverifikasi kode...");
    this.sessionId = this._generateSessionId();
    const verifyResponse = await this.api.post(this.config.endpoints.auth.verifyCode, {
      email: email,
      code: verificationCode
    }, {
      headers: this._updateHeaders()
    });
    if (verifyResponse.data.errCode !== 0) {
      throw new Error("Gagal memverifikasi kode: " + verifyResponse.data.errMsg);
    }
    const registerToken = verifyResponse.data.data.register_token;
    console.log("Proses: Mendaftarkan akun...");
    this.sessionId = this._generateSessionId();
    const registerResponse = await this.api.post(this.config.endpoints.auth.register, {
      email: email,
      register_token: registerToken,
      name: "",
      password: password,
      password2: password,
      code: verificationCode,
      invite_code: null
    }, {
      headers: this._updateHeaders()
    });
    if (registerResponse.data.errCode !== 0) {
      throw new Error("Gagal mendaftarkan akun: " + registerResponse.data.errMsg);
    }
    const token = registerResponse.data.data.token;
    const userId = registerResponse.data.data.id;
    console.log("Proses: Mengambil profil pengguna...");
    this.sessionId = this._generateSessionId();
    const profileResponse = await this.api.get(this.config.endpoints.auth.profile, {
      headers: this._updateHeaders(token)
    });
    console.log("Proses: Mengklaim kredit login...");
    this.sessionId = this._generateSessionId();
    await this.api.post(`${this.config.endpoints.credit.reward}?action=Login`, {}, {
      headers: this._updateHeaders(token)
    });
    const sessionData = {
      token: token,
      userId: userId,
      email: email,
      deviceId: this.deviceId,
      password: password
    };
    console.log("\n[SUCCESS] Registrasi DIGEN AI berhasil!");
    return sessionData;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi DIGEN AI baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `digenai-session-${this._generateRandomDeviceId()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi DIGEN AI baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        userId: sessionData.userId,
        password: sessionData.password
      };
    } catch (error) {
      console.error(`Proses registrasi DIGEN AI gagal: ${error.message}`);
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
    this.deviceId = sessionData.deviceId || this._generateRandomDeviceId();
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async image({
    key,
    prompt,
    image_url = null,
    image_size = "640x640",
    width = 640,
    height = 640,
    strength = "0.9",
    model = "image_motion",
    resolution_model = "3:4",
    batch_size = 1
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      const isImageToImage = !!image_url;
      console.log(`Proses: ${isImageToImage ? "Image to Image" : "Text to Image"} dengan model ${model}...`);
      let processedReferenceImages = [];
      if (isImageToImage) {
        const processedImageUrl = await this._processImageInput(image_url, true);
        processedReferenceImages = [{
          image_url: processedImageUrl
        }];
      }
      const payload = {
        image_size: image_size,
        width: width,
        height: height,
        lora_id: "",
        prompt: prompt,
        batch_size: batch_size,
        strength: strength,
        model: model,
        resolution_model: resolution_model,
        reference_images: processedReferenceImages
      };
      console.log("Proses: Payload untuk image generation:", {
        model: payload.model,
        prompt: payload.prompt.substring(0, 50) + "...",
        type: isImageToImage ? "image-to-image" : "text-to-image",
        referenceImagesCount: processedReferenceImages.length,
        image_size: payload.image_size
      });
      const response = await this.api.post(this.config.endpoints.tools.textToImage, payload, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.errCode !== 0) {
        throw new Error(response.data.errMsg || "Gagal membuat gambar");
      }
      console.log("Proses: Permintaan gambar berhasil dibuat");
      return {
        ...response.data,
        key: currentKey,
        type: isImageToImage ? "image-to-image" : "text-to-image"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.errMsg || error.message;
      console.error(`Proses pembuatan gambar gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async video({
    key,
    prompt,
    image_url = null,
    model = "wan",
    scene_id = "16",
    lipsync = "2",
    audio_url = "https://digen-asset.s3.us-west-1.amazonaws.com/audio/gen3.mp3",
    aspect_ratio = "portrait",
    seconds = "10",
    engine = "sora2"
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      const isImageToVideo = !!image_url;
      console.log(`Proses: ${isImageToVideo ? "Image to Video" : "Text to Video"} dengan model ${model}...`);
      let processedImageUrl = "";
      if (isImageToVideo) {
        processedImageUrl = await this._processImageInput(image_url, false);
      }
      const scene_params = {
        tags: "Sora2",
        thumbnail: processedImageUrl,
        thumbnail_v1: processedImageUrl,
        image_url: processedImageUrl,
        image_url_v1: processedImageUrl,
        upload_sora_url: processedImageUrl,
        lipsync: lipsync,
        audio_url: audio_url,
        video_gen_prompt: prompt,
        aspect_ratio: aspect_ratio,
        seconds: seconds,
        engine: engine
      };
      const payload = {
        scene_id: scene_id,
        model: model,
        scene_params: JSON.stringify(scene_params)
      };
      console.log("Proses: Payload untuk video generation:", {
        model: payload.model,
        prompt: prompt.substring(0, 50) + "...",
        type: isImageToVideo ? "image-to-video" : "text-to-video",
        scene_id: payload.scene_id,
        aspect_ratio: aspect_ratio
      });
      const response = await this.api.post(this.config.endpoints.scene.submit, payload, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.errCode !== 0) {
        throw new Error(response.data.errMsg || "Gagal membuat video");
      }
      console.log("Proses: Permintaan video berhasil dibuat");
      return {
        ...response.data,
        key: currentKey,
        type: isImageToVideo ? "image-to-video" : "text-to-video"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.errMsg || error.message;
      console.error(`Proses pembuatan video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status_image({
    key,
    jobId: jobID
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status image untuk jobID ${jobID}...`);
      const response = await this.api.post(this.config.endpoints.video.getTask, {
        jobID: jobID
      }, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.errCode !== 0) {
        throw new Error(response.data.errMsg || "Gagal mendapatkan status image");
      }
      console.log("Proses: Status image berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey,
        type: "image"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.errMsg || error.message;
      console.error(`Proses pengecekan status image gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status_video({
    key,
    jobId: jobID = null
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      if (jobID) {
        console.log(`Proses: Mengecek status video spesifik untuk jobID ${jobID}...`);
        const response = await this.api.post(this.config.endpoints.video.getTask, {
          jobID: jobID
        }, {
          headers: this._updateHeaders(sessionData.token)
        });
        if (response.data.errCode !== 0) {
          throw new Error(response.data.errMsg || "Gagal mendapatkan status video");
        }
        console.log("Proses: Status video spesifik berhasil didapatkan");
        return {
          ...response.data,
          key: currentKey,
          type: "video-specific"
        };
      } else {
        console.log(`Proses: Mengambil daftar video untuk status...`);
        const response = await this.api.get(this.config.endpoints.video.list, {
          params: {
            page: 0,
            pageSize: 20
          },
          headers: this._updateHeaders(sessionData.token)
        });
        if (response.data.errCode !== 0) {
          throw new Error(response.data.errMsg || "Gagal mengambil daftar video");
        }
        console.log("Proses: Daftar video berhasil didapatkan");
        return {
          ...response.data,
          key: currentKey,
          type: "video-list"
        };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.errMsg || error.message;
      console.error(`Proses pengecekan status video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_videos({
    key,
    page = 0,
    pageSize = 10
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengambil daftar video...`);
      const response = await this.api.get(this.config.endpoints.video.list, {
        params: {
          page: page,
          pageSize: pageSize
        },
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.errCode !== 0) {
        throw new Error(response.data.errMsg || "Gagal mengambil daftar video");
      }
      console.log("Proses: Daftar video berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey
      };
    } catch (error) {
      const errorMessage = error.response?.data?.errMsg || error.message;
      console.error(`Proses mengambil daftar video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi DIGEN AI...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("digenai-session-")).map(paste => paste.key);
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
  const api = new DigenAIAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
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
      case "status_image":
        if (!params.jobId) {
          return res.status(400).json({
            error: "Parameter 'jobId' wajib diisi untuk action 'status_image'."
          });
        }
        response = await api.status_image(params);
        break;
      case "status_video":
        response = await api.status_video(params);
        break;
      case "list_videos":
        response = await api.list_videos(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'image', 'video', 'status_image', 'status_video', 'list_videos', 'list_key', 'del_key'.`
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