import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class MagicLightAPI {
  constructor() {
    this.baseURL = "https://api.magiclight.ai";
    this.mailAPI = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.token = null;
    this.user = null;
    this.sessionId = "sess_" + this.randString(14);
    this.password = "@" + this.randString(10);
    this.username = "user_" + this.randString(5);
    this.affiliation = this.randString(9);
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 3e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "custom-client": "mobile",
        "custom-version": "1.2.5",
        referer: "https://m.magiclight.ai/",
        ...SpoofHead()
      }
    });
    this.api.interceptors.request.use(config => {
      if (this.token) {
        config.headers.authorization = `Bearer ${this.token}`;
      }
      return config;
    });
    this.api.interceptors.response.use(response => response, error => {
      console.error("API Error:", error.response?.data || error.message);
      return Promise.reject(error);
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
      return response.data.email;
    } catch (error) {
      throw new Error(`Failed to create temp email: ${error.message}`);
    }
  }
  async getOTPFromEmail(email, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${this.mailAPI}?action=message&email=${email}`);
        const messages = response.data?.data;
        if (messages && messages.length > 0) {
          const textContent = messages[0].text_content;
          const otpMatch = textContent.match(/\d{6}/);
          if (otpMatch) {
            return otpMatch[0];
          }
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
        type: "email"
      });
      if (response.data.code !== 200) {
        throw new Error("Failed to send OTP");
      }
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
      if (response.data.code !== 200) {
        throw new Error("Registration failed");
      }
      return response.data;
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
  async loginUser(email, code) {
    try {
      const response = await this.api.post("/api/user/signin", {
        phone: email,
        password: this.password,
        code: code
      });
      if (response.data.code !== 200) {
        throw new Error("Login failed");
      }
      this.token = response.data.data.accessToken;
      this.user = response.data.data.user;
      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }
  async ensureAuth() {
    if (this.token) return;
    console.log("[🔄] Creating temporary email...");
    const email = await this.createTempEmail();
    console.log("[✅] Email created:", email);
    console.log("[📨] Sending OTP...");
    await this.sendOTP(email);
    console.log("[⌛] Waiting for OTP...");
    const otp = await this.getOTPFromEmail(email);
    console.log("[✅] OTP received:", otp);
    console.log("[📝] Registering user...");
    await this.registerUser(email, otp);
    console.log("[🔐] Logging in...");
    await this.loginUser(email, otp);
    console.log("[✅] Authentication successful");
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
  async enhance({
    prompt
  }) {
    try {
      await this.ensureAuth();
      console.log("[✨] Enhancing prompt:", prompt);
      const response = await this.api.post("/api/lora-group/ai-expand", {
        prompt: prompt
      });
      return {
        success: true,
        data: response.data
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
      await this.ensureAuth();
      const {
        prompt = "AI generated",
          name = "gen",
          gender = 1,
          age = 2,
          styleGroupId = "39",
          kindId = "1",
          loraType = 2, ...rest
      } = options;
      console.log("[🎨] Generating image for prompt:", prompt);
      const response = await this.api.post("/api/task/lora", {
        name: name,
        description: prompt,
        gender: gender,
        age: age,
        styleGroupId: styleGroupId,
        kindId: kindId,
        trainImgUrl: [],
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
      const taskInfo = {
        task_id: taskId,
        type: "txt2img",
        sessionId: this.sessionId,
        token: this.token,
        loraGroupId: loraGroupId
      };
      const encryptedTaskId = await this.enc(taskInfo);
      return {
        success: true,
        task_id: encryptedTaskId,
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
      await this.ensureAuth();
      const {
        imgId = "7353287183458660352",
          imgUrl = "https://images.magiclight.ai/rp-outputs/7353286857871646720/7353286857867452417/7353286870626484227_BhnE_lo0_0.jpg",
          projectId = "7353286857871646720",
          flowId = "7353286857867452417",
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
          forceUsePayCredit = false, ...rest
      } = options;
      if (!imgUrl) {
        throw new Error("Required parameters: imgUrl");
      }
      console.log("[🎥] Converting image to video...");
      const response = await this.api.post("/api/task/image2video", {
        styleId: styleId,
        imgId: imgId,
        imgUrl: imgUrl,
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
      const taskInfo = {
        task_id: taskId,
        type: "img2vid",
        sessionId: this.sessionId,
        token: this.token
      };
      const encryptedTaskId = await this.enc(taskInfo);
      return {
        success: true,
        task_id: encryptedTaskId,
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
  async status({
    task_id: encryptedTaskId
  }) {
    try {
      console.log("[🔍] Checking status for task:", encryptedTaskId);
      const taskData = await this.dec(encryptedTaskId);
      const tempApi = axios.create({
        baseURL: this.baseURL,
        headers: {
          authorization: `Bearer ${taskData.token}`
        }
      });
      let endpoint;
      if (taskData.type === "txt2img") {
        endpoint = `/api/history-lora/group/${taskData.loraGroupId}`;
      } else if (taskData.type === "img2vid") {
        endpoint = `/api/image/${taskData.task_id}`;
      } else {
        throw new Error("Unknown task type");
      }
      const response = await tempApi.get(endpoint);
      return {
        success: true,
        data: response.data.data,
        task_type: taskData.type,
        decrypted_info: taskData
      };
    } catch (error) {
      console.error("[❌] Status check error:", error.message);
      return {
        success: false,
        error: error.message
      };
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
        action: "img2vid | txt2img | enhance | status"
      }
    });
  }
  const client = new MagicLightAPI();
  try {
    let result;
    switch (action) {
      case "img2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields for 'txt2vid': prompt`
          });
        }
        result = await client.img2vid(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field for 'txt2img': prompt`
          });
        }
        result = await client.txt2img(params);
        break;
      case "enhance":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields for 'enhance': prompt`
          });
        }
        result = await client.enhance(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field for 'status': task_id`
          });
        }
        result = await client.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions are: img2vid, txt2img, enhance, status.`
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