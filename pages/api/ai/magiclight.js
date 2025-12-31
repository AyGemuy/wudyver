import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class WudysoftAPI {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api`
    });
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
}
class MagicLightAPI {
  constructor() {
    this.baseURL = "https://api.magiclight.ai";
    this.serverURL = "https://server.magiclight.ai";
    this.mailAPI = `https://${apiConfig.DOMAIN_URL}/api/mails/v23`;
    this.token = null;
    this.user = null;
    this.uuid = null;
    this.emailId = null;
    this.sessionId = "sess_" + this.randString(14);
    this.password = "@" + this.randString(10);
    this.username = "user_" + this.randString(5);
    this.affiliation = "magiclight.app";
    this.wudysoft = new WudysoftAPI();
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 3e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "custom-client": "mobile",
        "custom-version": "1.0.0",
        referer: "https://m.magiclight.ai/",
        ...SpoofHead()
      }
    });
    this.serverApi = axios.create({
      baseURL: this.serverURL,
      timeout: 3e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "custom-client": "mobile",
        "custom-version": "1.0.0",
        referer: "https://m.magiclight.ai/",
        ...SpoofHead()
      }
    });
    this.api.interceptors.request.use(config => {
      if (this.token) config.headers.authorization = `Bearer ${this.token}`;
      return config;
    });
    this.serverApi.interceptors.request.use(config => {
      if (this.token) config.headers.authorization = `Bearer ${this.token}`;
      return config;
    });
  }
  randString(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  async createTempEmail() {
    try {
      const response = await axios.get(`${this.mailAPI}?action=create`);
      this.uuid = response.data.uuid;
      this.emailId = response.data.email_id;
      return response.data.email.fullEmail;
    } catch (error) {
      throw new Error(`Failed to create temp email: ${error.message}`);
    }
  }
  async getOTPFromEmail(maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${this.mailAPI}?action=messages&uuid=${this.uuid}&email_id=${this.emailId}`);
        const messages = response.data?.messages;
        if (messages && messages.length > 0) {
          const html = messages[0].body;
          const $ = cheerio.load(html);
          const otp = $("#c").text().trim();
          if (otp) return otp;
        }
        console.log(`[⌛] Waiting for OTP (${i + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 3e3));
      } catch (error) {
        console.error(`Error checking email: ${error.message}`);
      }
    }
    throw new Error("OTP not received within timeout period");
  }
  async sendOTP(email) {
    try {
      const response = await this.api.post("/api/user/send-sms-code", {
        phone: email,
        captchaCode: "",
        method: "signup",
        type: "email",
        inviteCode: this.affiliation,
        bdVid: ""
      });
      if (response.data.code !== 200) throw new Error("Failed to send OTP");
      return true;
    } catch (error) {
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }
  async registerUser(email, otp) {
    try {
      const response = await this.api.post("/api/user/signup", {
        displayName: this.username,
        password: this.password,
        confirm: this.password,
        phoneOrEmail: email,
        code: otp,
        affiliation: this.affiliation
      });
      if (response.data.code !== 200) throw new Error("Registration failed");
      return response.data;
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
  async loginUser(email) {
    try {
      const response = await this.api.post("/api/user/signin", {
        phone: email,
        password: this.password,
        code: "",
        inviteCode: this.affiliation,
        bdVid: ""
      });
      if (response.data.code !== 200) throw new Error("Login failed");
      this.token = response.data.data.accessToken;
      this.user = response.data.data.user;
      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }
  async register() {
    try {
      console.log("\n====== MEMULAI PROSES REGISTRASI MAGICLIGHT AI ======");
      console.log("[🔄] Creating temporary email...");
      const email = await this.createTempEmail();
      console.log("[✅] Email created:", email);
      console.log("[📨] Sending OTP...");
      await this.sendOTP(email);
      console.log("[⌛] Waiting for OTP...");
      const otp = await this.getOTPFromEmail();
      console.log("[✅] OTP received:", otp);
      console.log("[📝] Registering user...");
      await this.registerUser(email, otp);
      console.log("[🔐] Logging in...");
      await this.loginUser(email);
      console.log("[✅] Authentication successful");
      const sessionKey = await this.saveSession();
      console.log(`[🔑] Session key created: ${sessionKey}`);
      console.log("\n[SUCCESS] Registrasi MAGICLIGHT AI berhasil!");
      return {
        key: sessionKey,
        email: email,
        username: this.username,
        password: this.password
      };
    } catch (error) {
      console.error(`Proses registrasi MAGICLIGHT AI gagal: ${error.message}`);
      throw error;
    }
  }
  async saveSession() {
    const sessionData = {
      token: this.token,
      user: this.user,
      sessionId: this.sessionId,
      password: this.password,
      username: this.username
    };
    const title = `magiclight-session-${this.randString(8)}`;
    const key = await this.wudysoft.createPaste(title, JSON.stringify(sessionData));
    return key;
  }
  async loadSession(key) {
    const sessionString = await this.wudysoft.getPaste(key);
    if (!sessionString) {
      throw new Error("Failed to load session from key");
    }
    const sessionData = JSON.parse(sessionString);
    this.token = sessionData.token;
    this.user = sessionData.user;
    this.sessionId = sessionData.sessionId;
    this.password = sessionData.password;
    this.username = sessionData.username;
    return sessionData;
  }
  async ensureAuth(key = null) {
    if (key) {
      try {
        console.log("[🔑] Loading session from key:", key);
        await this.loadSession(key);
        console.log("[✅] Session loaded successfully");
        return key;
      } catch (error) {
        console.log("[⚠️] Failed to load session, creating new one...");
      }
    }
    if (this.token) return null;
    console.log("[🔄] Creating temporary email...");
    const email = await this.createTempEmail();
    console.log("[✅] Email created:", email);
    console.log("[📨] Sending OTP...");
    await this.sendOTP(email);
    console.log("[⌛] Waiting for OTP...");
    const otp = await this.getOTPFromEmail();
    console.log("[✅] OTP received:", otp);
    console.log("[📝] Registering user...");
    await this.registerUser(email, otp);
    console.log("[🔐] Logging in...");
    await this.loginUser(email);
    console.log("[✅] Authentication successful");
    const newKey = await this.saveSession();
    console.log("[🔑] Session key created:", newKey);
    return newKey;
  }
  async processMedia(media) {
    if (!media) return null;
    if (typeof media === "string" && media.startsWith("http")) {
      return media;
    }
    let buffer;
    if (Buffer.isBuffer(media)) {
      buffer = media;
    } else if (typeof media === "string") {
      buffer = Buffer.from(media.replace(/^data:image\/\w+;base64,/, ""), "base64");
    } else {
      throw new Error("Invalid media format");
    }
    const filename = `personal-lora/${this.randString(8)}-${this.randString(4)}-${this.randString(4)}-${this.randString(4)}-${this.randString(12)}.jpg`;
    const signResponse = await this.api.post("/api/file/sign-cdn-upload-url", {
      url: filename
    });
    if (signResponse.data.code !== 200) {
      throw new Error("Failed to get upload URL");
    }
    const uploadUrl = signResponse.data.data;
    await axios.put(uploadUrl, buffer, {
      headers: {
        "Content-Type": "image/jpeg"
      }
    });
    return `https://cdn2-static.magiclight.ai/${filename}`;
  }
  async faceDetect(url) {
    const response = await this.api.post("/api/file/new-face-detect", {
      url: url,
      censorType: "HUMAN_FACE"
    });
    if (response.data.code !== 200 || !response.data.data.success) {
      throw new Error("Face detection failed");
    }
    return response.data.data;
  }
  async enhance({
    prompt,
    key = null
  }) {
    try {
      const sessionKey = await this.ensureAuth(key);
      console.log("[✨] Enhancing prompt:", prompt);
      const response = await this.api.post("/api/lora-group/ai-expand", {
        prompt: prompt
      });
      return {
        success: true,
        data: response.data,
        key: sessionKey || key
      };
    } catch (error) {
      console.error("[❌] Enhance error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async txt2img(options = {}) {
    try {
      const {
        prompt = "AI generated",
          name = "gen",
          gender = 1,
          age = 2,
          styleGroupId = "2",
          kindId = "1",
          loraType = 2,
          image = null,
          key = null, ...rest
      } = options;
      const sessionKey = await this.ensureAuth(key);
      console.log("[🎨] Generating image for prompt:", prompt);
      let trainImgUrl = [];
      if (image) {
        const uploadedUrl = await this.processMedia(image);
        await this.faceDetect(uploadedUrl);
        trainImgUrl = [{
          type: 5,
          url: uploadedUrl,
          text: "Character"
        }];
      }
      const response = await this.api.post("/api/task/lora", {
        name: name,
        description: prompt,
        gender: gender,
        age: age,
        styleGroupId: styleGroupId,
        kindId: kindId,
        trainImgUrl: trainImgUrl,
        loraGroupId: "",
        loraType: loraType,
        userDesc: prompt,
        ...rest
      });
      if (response.data.code !== 200) {
        throw new Error("Text to image generation failed");
      }
      const {
        loraGroupId,
        taskId
      } = response.data.data;
      return {
        success: true,
        data: {
          task_id: taskId,
          loraGroupId: loraGroupId,
          type: "image",
          mode: "txt2img"
        },
        key: sessionKey || key,
        raw: response.data.data
      };
    } catch (error) {
      console.error("[❌] txt2img error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async img2vid(options) {
    try {
      const {
        imgId = null,
          imgUrl = null,
          image = null,
          projectId = null,
          flowId = null,
          styleId = "1033",
          voiceId = "MM:aojiao_nanyou",
          voiceContent = "AI generated video",
          speed = 1,
          language = "english",
          useSubtitleReducer = false,
          image2videoType = "FaceDriven",
          image2videoProType = "lipsync",
          ratio = 1,
          prompt = "",
          isUpdateDesc = false,
          forceUsePayCredit = false,
          key = null, ...rest
      } = options;
      const sessionKey = await this.ensureAuth(key);
      let finalImgUrl = imgUrl;
      if (!finalImgUrl && image) {
        finalImgUrl = await this.processMedia(image);
      }
      if (!finalImgUrl) {
        throw new Error("Required parameters: imgUrl or image");
      }
      console.log("[🎥] Converting image to video...");
      const response = await this.api.post("/api/task/image2video", {
        styleId: styleId,
        imgId: imgId,
        imgUrl: finalImgUrl,
        voiceId: voiceId,
        voiceContent: voiceContent,
        speed: speed,
        language: language,
        useSubtitleReducer: useSubtitleReducer,
        projectId: projectId,
        flowId: flowId,
        ratio: ratio,
        prompt: prompt,
        image2videoType: image2videoType,
        image2videoProType: image2videoProType,
        isUpdateDesc: isUpdateDesc,
        forceUsePayCredit: forceUsePayCredit,
        ...rest
      });
      if (response.data.code !== 200) {
        throw new Error("Image to video conversion failed");
      }
      const taskId = response.data.data.id;
      return {
        success: true,
        data: {
          task_id: taskId,
          type: "video",
          mode: "img2vid"
        },
        key: sessionKey || key,
        raw: response.data.data
      };
    } catch (error) {
      console.error("[❌] img2vid error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async txt2music(options = {}) {
    try {
      const {
        prompt = "AI generated music",
          style = 1,
          key = null, ...rest
      } = options;
      const sessionKey = await this.ensureAuth(key);
      console.log("[🎵] Generating music for prompt:", prompt);
      const response = await this.serverApi.post("/task-schedule/music/create", {
        prompt: prompt,
        style: style,
        ...rest
      });
      if (response.data.biz_code !== 1e4) {
        throw new Error("Music generation failed");
      }
      return {
        success: true,
        data: {
          task_id: response.data.data.taskId,
          musicIds: response.data.data.musicIds,
          type: "audio",
          mode: "txt2music"
        },
        key: sessionKey || key,
        raw: response.data.data
      };
    } catch (error) {
      console.error("[❌] txt2music error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async status({
    task_id = null,
    loraGroupId = null,
    musicIds = null,
    type = null,
    mode = null,
    key = null
  }) {
    try {
      if (!task_id && !loraGroupId && !musicIds) {
        throw new Error("Required parameters: task_id, loraGroupId, or musicIds");
      }
      console.log("[🔍] Checking status...");
      if (key) {
        await this.loadSession(key);
      }
      const tempApi = axios.create({
        baseURL: mode === "txt2music" ? this.serverURL : this.baseURL,
        headers: {
          authorization: `Bearer ${this.token}`
        }
      });
      let endpoint, response;
      if (type === "image" || mode === "txt2img" || loraGroupId) {
        endpoint = `/api/history-lora/group/${loraGroupId}`;
        response = await tempApi.get(endpoint);
      } else if (type === "video" || mode === "img2vid" || task_id && !musicIds) {
        endpoint = `/api/image/${task_id}`;
        response = await tempApi.get(endpoint);
      } else if (type === "audio" || mode === "txt2music" || musicIds) {
        endpoint = `/task-schedule/music/list`;
        response = await tempApi.post(endpoint, {
          musicIds: Array.isArray(musicIds) ? musicIds : [musicIds],
          page: 1,
          pageSize: Array.isArray(musicIds) ? musicIds.length : 1
        });
      } else {
        throw new Error("Unknown task type");
      }
      return {
        success: true,
        data: response.data.data,
        task_type: type,
        mode: mode,
        key: key
      };
    } catch (error) {
      console.error("[❌] Status check error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async list_key() {
    try {
      console.log("Proses: Mengambil daftar semua kunci sesi MAGICLIGHT AI...");
      const allPastes = await this.wudysoft.listPastes();
      return allPastes.filter(paste => paste.title && paste.title.startsWith("magiclight-session-")).map(paste => paste.key);
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
      error: "Missing required field: action",
      required: {
        action: "register | video | image | audio | enhance | status | list_key | del_key"
      }
    });
  }
  const client = new MagicLightAPI();
  try {
    let result;
    switch (action) {
      case "register":
        result = await client.register();
        break;
      case "video":
        if (!params.voiceContent && !params.prompt) {
          return res.status(400).json({
            error: `Missing required field for 'video': voiceContent or prompt`
          });
        }
        result = await client.img2vid(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field for 'image': prompt`
          });
        }
        result = await client.txt2img(params);
        break;
      case "audio":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field for 'audio': prompt`
          });
        }
        result = await client.txt2music(params);
        break;
      case "enhance":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field for 'enhance': prompt`
          });
        }
        result = await client.enhance(params);
        break;
      case "status":
        if (!params.task_id && !params.loraGroupId && !params.musicIds) {
          return res.status(400).json({
            error: `Missing required field for 'status': task_id, loraGroupId, or musicIds`
          });
        }
        result = await client.status(params);
        break;
      case "list_key":
        result = await client.list_key();
        break;
      case "del_key":
        if (!params.key) {
          return res.status(400).json({
            error: `Missing required field for 'del_key': key`
          });
        }
        result = await client.del_key(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions are: register, video, image, audio, enhance, status, list_key, del_key.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`API Error for action ${action}:`, error.message);
    return res.status(500).json({
      error: `Processing error for action '${action}': ${error.message}`
    });
  }
}