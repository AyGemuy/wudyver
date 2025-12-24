import axios from "axios";
import crypto from "crypto";
import OSS from "ali-oss";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class PixVerseImg2Vid {
  constructor() {
    this.baseUrl = "https://app-api.pixverse.ai";
    this.wudysoftUrl = `https://${apiConfig.DOMAIN_URL}/api`;
    this.token = null;
    this.accountId = null;
    this.uploadCredentials = null;
    this.email = null;
    this.username = "Pix" + Math.random().toString(36).substring(2, 8);
    this.password = "PixVerse" + Math.random().toString(36).substring(2, 10);
    this.autoRegister = true;
    this.anonymousId = this.generateAnonymousId();
    this.ossClient = null;
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "Accept-Language": "id-ID",
      "X-Platform": "Web",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
      Referer: "https://app.pixverse.ai/create/image-text",
      ...SpoofHead()
    };
    if (this.token) {
      this.headers["Token"] = this.token;
      this.log("INIT", "Using existing token, skipping registration");
    }
  }
  log(action, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${action}] ${message}`);
    if (data) {
      console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
    }
  }
  async ensureAuth() {
    try {
      if (this.token) {
        this.log("AUTH", "Using existing token");
        return true;
      }
      if (!this.autoRegister) {
        throw new Error("Authentication required but auto-registration is disabled");
      }
      this.log("AUTH", "No token found, starting auto-registration");
      await this.registerAccount(this.username, this.password);
      return true;
    } catch (error) {
      this.log("AUTH", "Authentication check failed", error.message);
      throw error;
    }
  }
  async getTurnstileToken() {
    try {
      this.log("TURNSTILE", "Requesting Turnstile token");
      const url = `${this.wudysoftUrl}/tools/cf-token?url=https://app.pixverse.ai/register&sitekey=0x4AAAAAAATSS5Nb9KyiA05l`;
      const response = await axios.get(url);
      this.log("TURNSTILE", "Successfully obtained Turnstile token");
      return response.data.token;
    } catch (error) {
      this.log("TURNSTILE", "Failed to get Turnstile token", error.message);
      throw new Error(`Turnstile token error: ${error.message}`);
    }
  }
  async createTempEmail() {
    try {
      this.log("EMAIL", "Creating temporary email");
      const url = `${this.wudysoftUrl}/mails/v9?action=create`;
      const response = await axios.get(url);
      this.email = response.data.email;
      this.log("EMAIL", `Temporary email created: ${this.email}`);
      return this.email;
    } catch (error) {
      this.log("EMAIL", "Failed to create temporary email", error.message);
      throw new Error(`Email creation error: ${error.message}`);
    }
  }
  async getVerificationCode() {
    try {
      if (!this.email) {
        throw new Error("No email address available");
      }
      this.log("VERIFICATION", "Checking for verification code");
      const url = `${this.wudysoftUrl}/mails/v9?action=message&email=${this.email}`;
      const response = await axios.get(url);
      if (!response.data.data || response.data.data.length === 0) {
        throw new Error("No messages found in mailbox");
      }
      const textContent = response.data.data[0].text_content;
      const codeMatch = textContent.match(/\b\d{6}\b/);
      if (!codeMatch) {
        throw new Error("Verification code not found in email");
      }
      this.log("VERIFICATION", `Verification code found: ${codeMatch[0]}`);
      return codeMatch[0];
    } catch (error) {
      this.log("VERIFICATION", "Failed to get verification code", error.message);
      throw new Error(`Verification code error: ${error.message}`);
    }
  }
  async registerAccount(username = this.username, password = this.password) {
    try {
      this.username = username;
      this.password = password;
      if (this.token) {
        this.log("REGISTER", "Account already registered, skipping");
        return {
          status: "already_registered",
          token: this.token
        };
      }
      if (!this.email) {
        await this.createTempEmail();
      }
      this.log("REGISTER", "Starting account registration process");
      const validateToken = await this.getTurnstileToken();
      this.log("REGISTER", "Requesting verification code");
      const getCodeUrl = `${this.baseUrl}/creative_platform/account/getVerificationCode`;
      const getCodeData = {
        Username: this.username,
        Mail: this.email,
        Password: this.password,
        Validate: validateToken
      };
      const reqCod = await axios.post(getCodeUrl, getCodeData, {
        headers: this.headers
      });
      this.log("Res", "data", reqCod.data);
      this.log("REGISTER", "Waiting for verification code email...");
      let code = null;
      let attempts = 0;
      const maxAttempts = 60;
      const delayMs = 3e3;
      while (!code && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        try {
          code = await this.getVerificationCode();
        } catch (error) {
          this.log("REGISTER", `Attempt ${attempts}: ${error.message}`);
        }
      }
      if (!code) {
        throw new Error(`Verification code not received after ${maxAttempts} attempts`);
      }
      this.log("REGISTER", "Completing registration with verification code");
      const registerUrl = `${this.baseUrl}/creative_platform/account/register`;
      const registerData = {
        Username: this.username,
        Mail: this.email,
        Password: this.password,
        Code: code,
        Validate: validateToken
      };
      const response = await axios.post(registerUrl, registerData, {
        headers: this.headers
      });
      this.log("Res", "data", response.data);
      if (response.data.ErrCode !== 0) {
        throw new Error(response.data.ErrMsg || "Registration failed");
      }
      this.token = response.data.Resp.Result.Token;
      this.accountId = response.data.Resp.Result.AccountId;
      this.headers["Token"] = this.token;
      this.log("REGISTER", "Account successfully registered", {
        accountId: this.accountId,
        username: this.username,
        email: this.email
      });
      return {
        status: "registered",
        token: this.token,
        accountId: this.accountId,
        email: this.email
      };
    } catch (error) {
      this.log("REGISTER", "Account registration failed", error.message);
      throw new Error(`Registration error: ${error.message}`);
    }
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
  async register() {
    try {
      const data = await this.registerAccount();
      this.cleanup();
      return {
        token: await this.enc(data)
      };
    } catch (error) {
      this.log("REGISTER", "Account registration failed", error.message);
      throw new Error(`Registration error: ${error.message}`);
    }
  }
  async img2vid(options = {}) {
    try {
      if (!options.token) {
        const registration = await this.register();
        options.token = registration.token;
      }
      const data = await this.dec(options.token);
      this.token = data.token;
      this.headers["Token"] = data.token;
      this.accountId = data.accountId;
      const result = await this.createVideoFromImage(options);
      this.cleanup();
      return result;
    } catch (error) {
      this.log("VIDEO", "Video creation failed", error.message);
      throw new Error(`Video creation error: ${error.message}`);
    }
  }
  async list(options = {}) {
    try {
      if (!options.token) {
        const registration = await this.register();
        options.token = registration.token;
      }
      const data = await this.dec(options.token);
      this.token = data.token;
      this.headers["Token"] = data.token;
      this.accountId = data.accountId;
      const result = await this.getVideoList();
      this.cleanup();
      return result;
    } catch (error) {
      this.log("VIDEO", "Failed to get video list", error.message);
      throw new Error(`Video list error: ${error.message}`);
    }
  }
  async getUploadCredentials() {
    try {
      await this.ensureAuth();
      this.log("UPLOAD", "Requesting upload credentials");
      const url = `${this.baseUrl}/creative_platform/getUploadToken`;
      const response = await axios.post(url, {}, {
        headers: this.headers
      });
      if (response.data.ErrCode !== 0) {
        throw new Error(response.data.ErrMsg || "Failed to get upload credentials");
      }
      this.uploadCredentials = response.data.Resp;
      this.log("UPLOAD", "Successfully obtained upload credentials");
      return this.uploadCredentials;
    } catch (error) {
      this.log("UPLOAD", "Failed to get upload credentials", error.message);
      throw new Error(`Upload credentials error: ${error.message}`);
    }
  }
  async initializeOSSClient() {
    try {
      if (!this.uploadCredentials) {
        await this.getUploadCredentials();
      }
      this.log("OSS", "Initializing OSS client");
      this.ossClient = new OSS({
        region: "oss-accelerate",
        accessKeyId: this.uploadCredentials.Ak,
        accessKeySecret: this.uploadCredentials.Sk,
        stsToken: this.uploadCredentials.Token,
        bucket: "pixverse-fe-upload",
        secure: true,
        endpoint: "oss-accelerate.aliyuncs.com"
      });
      this.log("OSS", "OSS client initialized successfully");
      return this.ossClient;
    } catch (error) {
      this.log("OSS", "Failed to initialize OSS client", error.message);
      throw new Error(`OSS client initialization error: ${error.message}`);
    }
  }
  async uploadImage(imageUrl) {
    try {
      await this.ensureAuth();
      if (!this.ossClient) {
        await this.initializeOSSClient();
      }
      const filename = `${this.generateUUID()}.jpg`;
      const uploadPath = `upload/${filename}`;
      this.log("UPLOAD", `Downloading image from ${imageUrl}`);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"
        }
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      this.log("UPLOAD", `Image downloaded (${imageBuffer.length} bytes)`);
      this.log("UPLOAD", "Uploading image to OSS using ali-oss");
      const ossOptions = {
        headers: {
          "Content-Type": "image/jpeg",
          "x-oss-forbid-overwrite": "true",
          "x-oss-user-agent": "aliyun-sdk-js/6.23.0 Chrome Mobile 139.0.0.0 on K (Android 10)",
          "Access-Control-Allow-Origin": "*"
        },
        meta: {
          uploadedBy: "pixverse-client",
          uploadTime: new Date().toISOString()
        }
      };
      const ossResult = await this.ossClient.put(uploadPath, imageBuffer, ossOptions);
      this.log("UPLOAD", "Image successfully uploaded to OSS via ali-oss", {
        name: ossResult.name,
        url: ossResult.url,
        res: ossResult.res?.status
      });
      this.log("UPLOAD", "Registering uploaded image with PixVerse");
      const registerUrl = `${this.baseUrl}/creative_platform/media/batch_upload_media`;
      const aiTraceId = this.generateUUID();
      const registerData = {
        images: [{
          name: filename,
          size: imageBuffer.length,
          path: uploadPath
        }]
      };
      const registerHeaders = {
        ...this.headers,
        "Ai-Trace-Id": aiTraceId,
        "Ai-Anonymous-Id": this.anonymousId,
        Token: this.token
      };
      this.log("UPLOAD", "Sending registration request", {
        aiTraceId: aiTraceId,
        anonymousId: this.anonymousId,
        registerData: registerData
      });
      const response = await axios.post(registerUrl, registerData, {
        headers: registerHeaders
      });
      this.log("UPLOAD", "Registration response received", {
        status: response.status,
        data: response.data
      });
      if (response.data.ErrCode !== 0) {
        this.log("UPLOAD", "Image registration failed", {
          errorCode: response.data.ErrCode,
          errorMessage: response.data.ErrMsg,
          responseData: response.data
        });
        throw new Error(response.data.ErrMsg || "Image registration failed");
      }
      this.log("UPLOAD", "Image successfully registered", {
        path: uploadPath,
        url: response.data.Resp.result[0].url
      });
      return {
        path: uploadPath,
        url: response.data.Resp.result[0].url,
        ossResult: ossResult
      };
    } catch (error) {
      this.log("UPLOAD", "Image upload failed", error.message);
      throw new Error(`Image upload error: ${error.message}`);
    }
  }
  async createVideoFromImage(options) {
    try {
      await this.ensureAuth();
      const {
        imageUrl,
        prompt,
        duration = 5,
        quality = "360p",
        motion_mode = "normal",
        model = "v4.5",
        templateId
      } = options;
      this.log("VIDEO", "Starting video creation process", options);
      const uploadedImage = await this.uploadImage(imageUrl);
      const url = `${this.baseUrl}/creative_platform/video/i2v`;
      const data = {
        customer_img_path: uploadedImage.path,
        customer_img_url: uploadedImage.url,
        prompt: prompt,
        duration: duration,
        quality: quality,
        motion_mode: motion_mode,
        model: model,
        create_count: 1,
        seed: Math.floor(Math.random() * 1e9),
        credit_change: 20
      };
      if (templateId) {
        data.template_id = templateId;
        data.effect_type = "1";
        data.customer_img_count = 1;
        this.log("VIDEO", "Using template ID:", templateId);
      }
      this.log("VIDEO", "Submitting video creation request");
      const response = await axios.post(url, data, {
        headers: {
          ...this.headers,
          Refresh: "credit"
        }
      });
      if (response.data.ErrCode !== 0) {
        throw new Error(response.data.ErrMsg || "Video creation failed");
      }
      this.log("VIDEO", "Video creation successful", {
        video_id: response.data.Resp.video_id,
        video_ids: response.data.Resp.video_ids
      });
      this.log("AUTH", "TOKEN", {
        token: this.token
      });
      return response.data;
    } catch (error) {
      this.log("VIDEO", "Video creation failed", error.message);
      throw new Error(`Video creation error: ${error.message}`);
    }
  }
  async getVideoList(offset = 0, limit = 50) {
    try {
      await this.ensureAuth();
      this.log("VIDEOLIST", "Fetching video list");
      const url = `${this.baseUrl}/creative_platform/video/list/personal`;
      const data = {
        offset: offset,
        limit: limit,
        polling: true,
        filter: {
          off_peak: 0
        },
        web_offset: 0,
        app_offset: 0
      };
      const response = await axios.post(url, data, {
        headers: this.headers
      });
      if (response.data.ErrCode !== 0) {
        throw new Error(response.data.ErrMsg || "Failed to get video list");
      }
      this.log("VIDEOLIST", `Retrieved ${response.data.Resp?.length || 0} videos`);
      return response.data;
    } catch (error) {
      this.log("VIDEOLIST", "Failed to get video list", error.message);
      throw new Error(`Video list error: ${error.message}`);
    }
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  generateTraceId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }
  generateAnonymousId() {
    const part1 = Math.random().toString(16).substring(2, 15);
    const part2 = Math.random().toString(16).substring(2, 16);
    const part3 = Math.random().toString(16).substring(2, 9);
    const part4 = Math.random().toString(16).substring(2, 8);
    const part5 = Math.random().toString(16).substring(2, 16);
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  }
  setToken(token) {
    this.token = token;
    this.headers["Token"] = token;
    this.log("TOKEN", "Manual token set");
    return this;
  }
  getAuthStatus() {
    return {
      isAuthenticated: !!this.token,
      token: this.token,
      accountId: this.accountId,
      email: this.email,
      username: this.username
    };
  }
  setAutoRegister(enabled) {
    this.autoRegister = enabled;
    return this;
  }
  setCredentials({
    username,
    password,
    email
  }) {
    if (username) this.username = username;
    if (password) this.password = password;
    if (email) this.email = email;
    return this;
  }
  cleanup() {
    if (this.ossClient) {
      this.log("CLEANUP", "Cleaning up OSS client");
      this.ossClient = null;
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
        action: "register | img2vid | list"
      }
    });
  }
  const pixverse = new PixVerseImg2Vid();
  try {
    let result;
    switch (action) {
      case "register":
        result = await pixverse[action]();
        break;
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2vid."
          });
        }
        result = await pixverse[action](params);
        break;
      case "list":
        if (!params.token) {
          return res.status(400).json({
            error: "Token are required for list."
          });
        }
        result = await pixverse[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: register | img2vid | list`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}