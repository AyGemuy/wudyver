import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import * as cheerio from "cheerio";
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
      const response = await this.client.get("/mails/v23", {
        params: {
          action: "create"
        }
      });
      return response.data;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.createEmail': ${error.message}`);
      throw error;
    }
  }
  async checkMessagesAicharalab(uuid, email_id) {
    try {
      const response = await this.client.get("/mails/v23", {
        params: {
          action: "messages",
          uuid: uuid,
          email_id: email_id
        }
      });
      const messages = response.data?.messages;
      if (messages && messages.length > 0) {
        const bodyText = messages[0].body || messages[0].textBody || "";
        const html = bodyText;
        const $ = cheerio.load(html);
        const otp = $(".button").text().trim() || (html.match(/\b\d{6}\b/) || [])[0];
        return otp ? otp : null;
      }
      return null;
    } catch (error) {
      console.error(`[ERROR] Gagal dalam 'WudysoftAPI.checkMessagesAicharalab': ${error.message}`);
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
class AicharalabAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.config = {
      baseURL: "https://aicharalab.com",
      endpoints: {
        auth: {
          registerCode: "/api/users/register-code",
          register: "/api/users/register",
          userInfo: "/api/users/user_info"
        },
        credit: {
          checkin: "/api/credit/checkin",
          details: "/api/credit/details"
        },
        dash: {
          upload: "/api/dash/upload",
          text2image: "/api/dash/text2image",
          image2image: "/api/dash/image2image",
          task: "/api/dash/task",
          taskStatus: "/api/dash/task-status"
        },
        video: {
          generate: "/api/video/vol-video-generate"
        },
        character: {
          generate: "/api/character/character-image"
        }
      }
    };
    this.defaultHeaders = {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://aicharalab.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://aicharalab.com/login",
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
      baseURL: this.config.baseURL,
      jar: this.cookieJar,
      withCredentials: true,
      headers: this.defaultHeaders
    }));
    this.wudysoft = new WudysoftAPI();
  }
  _generateRandomPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  _updateHeaders(token = null) {
    const headers = {
      ...this.defaultHeaders
    };
    if (token) {
      headers["authorization"] = `Bearer ${token}`;
      headers["token"] = token;
    }
    return headers;
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
  async _uploadImage(imageInput) {
    try {
      let buffer;
      let contentType = "image/png";
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http")) {
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(response.data);
          contentType = response.headers["content-type"] || "image/png";
        } else if (imageInput.startsWith("data:")) {
          const matches = imageInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
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
      formData.append("file", buffer, {
        filename: `image-${Date.now()}.png`,
        contentType: contentType
      });
      const response = await this.api.post(this.config.endpoints.dash.upload, formData, {
        headers: {
          ...this._updateHeaders(),
          ...formData.getHeaders()
        }
      });
      if (response.data.code !== 1e5) {
        throw new Error(response.data.message || "Failed to upload image");
      }
      return response.data.data.file_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }
  async _performRegistration() {
    console.log("\n====== MEMULAI PROSES REGISTRASI AICHARALAB ======");
    const emailData = await this.wudysoft.createEmail();
    if (!emailData) throw new Error("Gagal membuat email sementara.");
    console.log(emailData);
    const email = emailData.email.fullEmail;
    const uuid = emailData.uuid;
    const email_id = emailData.email_id;
    console.log(`Proses: Email dibuat: ${email}`);
    const password = this._generateRandomPassword();
    console.log(`Proses: Password acak dibuat: ${password}`);
    console.log("Proses: Mengirim kode verifikasi...");
    const sendCodeResponse = await this.api.post(this.config.endpoints.auth.registerCode, {
      email: email,
      domain: "aicharalab.com"
    }, {
      headers: this._updateHeaders()
    });
    console.log("Proses: Menunggu kode verifikasi...");
    let verificationCode = null;
    for (let i = 0; i < 60; i++) {
      verificationCode = await this.wudysoft.checkMessagesAicharalab(uuid, email_id);
      if (verificationCode) break;
      console.log(`Proses: Menunggu kode verifikasi... (${i + 1}/60)`);
      await sleep(3e3);
    }
    if (!verificationCode) throw new Error("Gagal menemukan kode verifikasi setelah 3 menit.");
    console.log(`Proses: Kode verifikasi ditemukan: ${verificationCode}`);
    console.log("Proses: Mendaftarkan akun...");
    const registerResponse = await this.api.post(this.config.endpoints.auth.register, {
      email: email,
      domain: "aicharalab.com",
      password: password,
      verify_code: verificationCode
    }, {
      headers: this._updateHeaders()
    });
    const cookies = this.cookieJar.getCookiesSync(this.config.baseURL);
    console.log(cookies);
    const tokenCookie = cookies.find(c => c.key === "access_token_cookie");
    if (!tokenCookie) throw new Error("Token tidak ditemukan setelah registrasi");
    const token = tokenCookie.value;
    console.log("Proses: Melakukan check-in untuk kredit...");
    let checkinSuccess = false;
    let checkinAttempts = 0;
    const maxCheckinAttempts = 10;
    while (!checkinSuccess && checkinAttempts < maxCheckinAttempts) {
      try {
        const checkinResponse = await this.api.get(this.config.endpoints.credit.checkin, {
          headers: this._updateHeaders(token)
        });
        if (checkinResponse.data && (checkinResponse.data.code === 1e5 || checkinResponse.data.status === 1e5)) {
          checkinSuccess = true;
          console.log("✓ Check-in berhasil!");
          console.log("Response:", checkinResponse.data);
        } else {
          checkinAttempts++;
          console.log(`Proses: Percobaan check-in ${checkinAttempts}/${maxCheckinAttempts}...`);
          if (checkinAttempts < maxCheckinAttempts) {
            await sleep(2e3);
          }
        }
      } catch (error) {
        checkinAttempts++;
        console.log(`[PERINGATAN] Check-in gagal (percobaan ${checkinAttempts}/${maxCheckinAttempts}): ${error.message}`);
        if (checkinAttempts < maxCheckinAttempts) {
          await sleep(2e3);
        }
      }
    }
    if (!checkinSuccess) {
      console.warn("[PERINGATAN] Check-in tidak berhasil setelah beberapa percobaan, melanjutkan proses...");
    }
    console.log("Proses: Mengambil info pengguna...");
    const userInfoResponse = await this.api.get(this.config.endpoints.auth.userInfo, {
      headers: this._updateHeaders(token)
    });
    const sessionData = {
      token: token,
      email: email,
      userInfo: userInfoResponse.data.data
    };
    console.log("\n[SUCCESS] Registrasi AICHARALAB berhasil!");
    return sessionData;
  }
  async register() {
    try {
      console.log("Proses: Mendaftarkan sesi AICHARALAB baru...");
      const sessionData = await this._performRegistration();
      const sessionToSave = JSON.stringify(sessionData);
      const sessionTitle = `aicharalab-session-${Date.now()}`;
      const newKey = await this.wudysoft.createPaste(sessionTitle, sessionToSave);
      if (!newKey) throw new Error("Gagal menyimpan sesi baru.");
      console.log(`-> Sesi AICHARALAB baru berhasil didaftarkan. Kunci Anda: ${newKey}`);
      return {
        key: newKey,
        email: sessionData.email,
        credits: sessionData.userInfo.credit_remain,
        type: "register"
      };
    } catch (error) {
      console.error(`Proses registrasi AICHARALAB gagal: ${error.message}`);
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
    return {
      sessionData: sessionData,
      key: currentKey
    };
  }
  async txt2img({
    key,
    prompt,
    resolution = "1K",
    aspect_ratio = "9:16",
    model = "nano-banana-pro"
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Text to Image dengan prompt: ${prompt.substring(0, 50)}...`);
      const response = await this.api.post(this.config.endpoints.dash.text2image, {
        prompts: prompt,
        resolution: resolution,
        aspect_ratio: aspect_ratio,
        model: model
      }, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.code !== 1e5) {
        throw new Error(response.data.msg || "Gagal membuat gambar");
      }
      console.log("Proses: Permintaan text-to-image berhasil dibuat");
      return {
        ...response.data?.data,
        key: currentKey,
        task_type: "image"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses text-to-image gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2img({
    key,
    prompt,
    image_url,
    resolution = "1K",
    aspect_ratio = "16:9",
    model = "nano-banana-pro"
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Image to Image dengan prompt: ${prompt.substring(0, 50)}...`);
      const imageUrls = Array.isArray(image_url) ? image_url : [image_url];
      const uploadedImages = [];
      for (const url of imageUrls) {
        const uploadedUrl = await this._uploadImage(url);
        uploadedImages.push(uploadedUrl);
      }
      const response = await this.api.post(this.config.endpoints.dash.image2image, {
        aspect_ratio: aspect_ratio,
        prompts: prompt,
        image_path: uploadedImages,
        resolution: resolution,
        project_name: "aicharalab",
        model: model
      }, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.code !== 1e5) {
        throw new Error(response.data.msg || "Gagal membuat gambar");
      }
      console.log("Proses: Permintaan image-to-image berhasil dibuat");
      return {
        ...response.data?.data,
        key: currentKey,
        task_type: "image"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses image-to-image gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async txt2vid({
    key,
    prompt,
    duration = 5,
    resolution = "720p",
    aspect_ratio = "16:9",
    model = 1,
    model_name = "seedance_1.0_pro_fast"
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Text to Video dengan prompt: ${prompt.substring(0, 50)}...`);
      const response = await this.api.post(this.config.endpoints.video.generate, {
        prompts: prompt,
        project_name: "aicharalab",
        model: model,
        duration: duration,
        resolution: resolution,
        aspect_ratio: aspect_ratio,
        model_name: model_name
      }, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.code !== 1e5) {
        throw new Error(response.data.msg || "Gagal membuat video");
      }
      console.log("Proses: Permintaan text-to-video berhasil dibuat");
      return {
        ...response.data?.data,
        key: currentKey,
        task_type: "video"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses text-to-video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async img2vid({
    key,
    prompt,
    image_url,
    duration = 5,
    resolution = "720p",
    aspect_ratio = "16:9",
    model = 2,
    model_name = "seedance_1.0_pro_fast"
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Image to Video dengan prompt: ${prompt.substring(0, 50)}...`);
      const imageUrls = Array.isArray(image_url) ? image_url : [image_url];
      const uploadedImages = [];
      for (const url of imageUrls) {
        const uploadedUrl = await this._uploadImage(url);
        uploadedImages.push(uploadedUrl);
      }
      const response = await this.api.post(this.config.endpoints.video.generate, {
        image_path: uploadedImages,
        prompts: prompt,
        project_name: "aicharalab",
        model: model,
        duration: duration,
        resolution: resolution,
        aspect_ratio: aspect_ratio,
        model_name: model_name
      }, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.code !== 1e5) {
        throw new Error(response.data.msg || "Gagal membuat video");
      }
      console.log("Proses: Permintaan image-to-video berhasil dibuat");
      return {
        ...response.data?.data,
        key: currentKey,
        task_type: "video"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses image-to-video gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async character({
    key,
    prompt,
    image_url = null,
    number = 2,
    aspect_ratio = "9:16",
    image_style = "default",
    style_transfer = 1,
    model = "seedream_4"
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Character generation dengan prompt: ${prompt.substring(0, 50)}...`);
      let uploadedImageUrl = "";
      if (image_url) {
        uploadedImageUrl = await this._uploadImage(image_url);
      }
      const response = await this.api.post(this.config.endpoints.character.generate, {
        number: number,
        aspect_ratio: aspect_ratio,
        prompts: prompt,
        image_style: image_style,
        image_path: uploadedImageUrl,
        style_transfer: style_transfer,
        model: model
      }, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.code !== 1e5) {
        throw new Error(response.data.msg || "Gagal membuat character");
      }
      console.log("Proses: Permintaan character generation berhasil dibuat");
      return {
        ...response.data?.data,
        key: currentKey,
        task_type: "image"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses character generation gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async clothes({
    key,
    prompt,
    image_url,
    t_id = 389
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Clothes changer dengan prompt: ${prompt.substring(0, 50)}...`);
      const imageUrls = Array.isArray(image_url) ? image_url : [image_url];
      const uploadedImages = [];
      for (const url of imageUrls) {
        const uploadedUrl = await this._uploadImage(url);
        uploadedImages.push(uploadedUrl);
      }
      const response = await this.api.post(this.config.endpoints.dash.task, {
        project_name: "aicharalab",
        t_id: t_id,
        image_path: uploadedImages,
        prompts: prompt
      }, {
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.code !== 1e5) {
        throw new Error(response.data.msg || "Gagal mengubah pakaian");
      }
      console.log("Proses: Permintaan clothes changer berhasil dibuat");
      return {
        ...response.data?.data,
        key: currentKey,
        task_type: "image",
        template_name: "change_cloth"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses clothes changer gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async status({
    key,
    task_id,
    task_type = "image",
    project_name = "aicharalab",
    template_name = null
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log(`Proses: Mengecek status task ${task_id}...`);
      const params = {
        task_id: task_id,
        project_name: project_name,
        task_type: task_type
      };
      if (template_name) {
        params.template_name = template_name;
      }
      const response = await this.api.get(this.config.endpoints.dash.taskStatus, {
        params: params,
        headers: this._updateHeaders(sessionData.token)
      });
      if (response.data.status !== 1e5) {
        throw new Error(response.data.msg || "Gagal mendapatkan status task");
      }
      console.log("Proses: Status task berhasil didapatkan");
      return {
        ...response.data?.data,
        key: currentKey,
        type: "status"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses pengecekan status gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async credits({
    key
  }) {
    try {
      const {
        key: currentKey,
        sessionData
      } = await this._ensureValidSession({
        key: key
      });
      console.log("Proses: Mengambil detail kredit...");
      const response = await this.api.get(this.config.endpoints.credit.details, {
        headers: this._updateHeaders(sessionData.token)
      });
      console.log("Proses: Detail kredit berhasil didapatkan");
      return {
        ...response.data,
        key: currentKey,
        type: "credits"
      };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message;
      console.error(`Proses mengambil kredit gagal: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi AICHARALAB...");
      const allPastes = await this.wudysoft.listPastes();
      const keys = allPastes.filter(paste => paste.title && paste.title.startsWith("aicharalab-session-")).map(paste => paste.key);
      return {
        keys: keys,
        type: "list_key"
      };
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
      return {
        success: false,
        message: "Kunci tidak disediakan untuk dihapus.",
        type: "del_key"
      };
    }
    try {
      console.log(`Proses: Mencoba menghapus kunci: ${key}`);
      const success = await this.wudysoft.delPaste(key);
      return {
        success: success,
        message: success ? `Kunci ${key} berhasil dihapus.` : `Gagal menghapus kunci ${key}.`,
        key: key,
        type: "del_key"
      };
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
  const api = new AicharalabAPI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register();
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.prompt || !params.image_url) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'image_url' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
        break;
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2vid'."
          });
        }
        response = await api.txt2vid(params);
        break;
      case "img2vid":
        if (!params.prompt || !params.image_url) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'image_url' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
        break;
      case "character":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'character'."
          });
        }
        response = await api.character(params);
        break;
      case "clothes":
        if (!params.prompt || !params.image_url) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'image_url' wajib diisi untuk action 'clothes'."
          });
        }
        response = await api.clothes(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "credits":
        response = await api.credits(params);
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'register', 'txt2img', 'img2img', 'txt2vid', 'img2vid', 'character', 'clothes', 'status', 'credits', 'list_key', 'del_key'.`
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