import axios from "axios";
import CryptoJS from "crypto-js";
import crypto from "crypto";
import FormData from "form-data";
import https from "https";
import apiConfig from "@/configs/apiConfig";
class VisWorld {
  constructor() {
    console.log("[INIT] Starting VisWorld client...");
    this.deviceId = this.genUUID();
    const httpsAgent = new https.Agent({
      keepAlive: true
    });
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://app.visworld.ai",
      priority: "u=1, i",
      referer: "https://app.visworld.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      "x-device-id": this.deviceId,
      "x-request-with": "XMLHttpRequest"
    };
    this.api = axios.create({
      baseURL: "https://api.visworld.ai/web",
      headers: headers
    });
    this.token = null;
    this.isAuth = false;
    console.log(`[INIT] Device ID: ${this.deviceId}`);
  }
  genUUID() {
    try {
      const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0,
          v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
      return uuid;
    } catch (error) {
      console.error("[UUID] Generation failed:", error);
      throw error;
    }
  }
  setToken(token) {
    try {
      if (!token || typeof token !== "string") {
        this.token = null;
        this.isAuth = false;
        delete this.api.defaults.headers.common["authorization"];
        return;
      }
      this.token = token;
      this.isAuth = true;
      this.api.defaults.headers.common["authorization"] = this.token;
    } catch (error) {
      console.error("[AUTH] Token setting failed:", error);
      throw error;
    }
  }
  async ensureAuth() {
    try {
      if (this.isAuth) return;
      await this.doReg();
    } catch (error) {
      console.error("[AUTH] Ensure failed:", error);
      throw error;
    }
  }
  async doReg() {
    try {
      console.log("[REG] Getting temp email...");
      const emailRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = emailRes.data?.email;
      if (!email) throw new Error("Failed to create temp email");
      console.log("[REG] Requesting verification code...");
      const verifyForm = new FormData();
      verifyForm.append("bizType", "0");
      verifyForm.append("email", email);
      await this.api.post("/verification-codes/email?locale=en", verifyForm);
      console.log("[REG] Waiting for verification code...");
      let code = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        try {
          const msgRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
          const content = msgRes.data?.data?.[0]?.text_content ?? "";
          const match = content.match(/your verification code is:\s*(\d{6})/);
          if (match?.[1]) {
            code = match[1];
            break;
          }
        } catch (error) {
          console.log(`[REG] Code check error: ${error.message}`);
        }
      }
      if (!code) throw new Error("Failed to get verification code");
      console.log("[REG] Getting public key...");
      const keyRes = await this.api.get("/users/me/key?locale=en");
      const publicKey = keyRes.data?.data;
      if (!publicKey) throw new Error("Failed to get public key");
      console.log("[REG] Encrypting password...");
      const password = this.genUUID();
      const hashedPwd = CryptoJS.SHA256(password).toString();
      const formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      const encryptedPwd = crypto.publicEncrypt({
        key: formattedKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(hashedPwd)).toString("base64");
      console.log("[REG] Completing registration...");
      const regForm = new FormData();
      regForm.append("code", code);
      regForm.append("email", email);
      regForm.append("pwd", encryptedPwd);
      regForm.append("utm", "utm_source=&cp_id=");
      const regRes = await this.api.post("/register?utm_source=&cp_id=&locale=en", regForm);
      const token = regRes.data?.data?.token;
      if (!token) throw new Error("Token not received");
      this.setToken(token);
      console.log("[REG] Registration completed");
    } catch (error) {
      console.error("[REG] Failed:", error.message);
      this.isAuth = false;
      throw error;
    }
  }
  async req(method, url, data = null, config = {}) {
    try {
      await this.ensureAuth();
      const makeReq = async () => {
        if (method === "get") return this.api.get(url, config);
        if (method === "post") return this.api.post(url, data, config);
      };
      const response = await makeReq();
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        this.isAuth = false;
        await this.ensureAuth();
        const makeReq = async () => {
          if (method === "get") return this.api.get(url, config);
          if (method === "post") return this.api.post(url, data, config);
        };
        return await makeReq();
      }
      throw error;
    }
  }
  async getStatus(taskId) {
    try {
      const response = await this.req("get", `/users/me/tasks/${taskId}?locale=en`);
      return response.data;
    } catch (error) {
      console.error(`[STATUS] Failed for task ${taskId}:`, error);
      throw error;
    }
  }
  async poll(taskId) {
    try {
      if (!taskId) throw new Error("Task ID required for polling");
      console.log(`[POLL] Starting for task: ${taskId}`);
      let attempt = 1;
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        const statusRes = await this.getStatus(taskId);
        if (!statusRes.success) {
          if (statusRes.errorCode === 801) {
            console.log(`[POLL] Task ${taskId} processing... (${attempt++})`);
            continue;
          }
          throw new Error(`Status check failed: ${statusRes.errorMsg}`);
        }
        const task = statusRes.data;
        console.log(`[POLL] Task ${taskId} status: ${task.status}`);
        if (task.status === 2) {
          console.log(`[POLL] Task ${taskId} completed`);
          return task;
        }
        if (task.status === 3) {
          throw new Error(`Task failed: ${task.failureReason}`);
        }
        attempt++;
      }
    } catch (error) {
      console.error(`[POLL] Failed for task ${taskId}:`, error);
      throw error;
    }
  }
  async txt2img({
    prompt,
    ...options
  }) {
    console.log("[T2I] Starting text to image generation");
    try {
      const form = new FormData();
      form.append("styleId", options.styleId || "62008010");
      form.append("height", options.height || "896");
      form.append("width", options.width || "512");
      form.append("text", prompt);
      form.append("categoryId", options.categoryId || "18");
      form.append("resultCount", options.resultCount || "1");
      const response = await this.req("post", "/users/me/models/text2img/tasks?locale=en", form);
      const taskId = response.data?.data?.taskId;
      if (!taskId) throw new Error("No task ID received");
      console.log(`[T2I] Task created: ${taskId}, polling...`);
      const result = await this.poll(taskId);
      const imageUrl = result.fileInfos?.[0]?.fileUrl;
      console.log("[T2I] Completed:", imageUrl);
      return {
        success: true,
        imageUrl: imageUrl,
        taskId: taskId,
        result: result
      };
    } catch (error) {
      console.error("[T2I] Failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async txt2vid({
    prompt,
    ...options
  }) {
    console.log("[T2V] Starting text to video generation");
    try {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("duration", options.duration || "5");
      Object.entries(options).forEach(([key, value]) => {
        if (key !== "duration") {
          form.append(key, value.toString());
        }
      });
      const response = await this.req("post", "/users/me/models/text2video/tasks?locale=en", form);
      const taskId = response.data?.data?.taskId;
      if (!taskId) throw new Error("No task ID received");
      console.log(`[T2V] Task created: ${taskId}, polling...`);
      const result = await this.poll(taskId);
      const videoUrl = result.fileInfos?.[0]?.fileUrl;
      console.log("[T2V] Completed:", videoUrl);
      return {
        success: true,
        videoUrl: videoUrl,
        taskId: taskId,
        result: result
      };
    } catch (error) {
      console.error("[T2V] Failed:", error);
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
      error: "Action is required."
    });
  }
  const client = new VisWorld();
  try {
    let response;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt are required for txt2img."
          });
        }
        response = await client.txt2img(params);
        return res.status(200).json(response);
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt are required for txt2vid."
          });
        }
        response = await client.txt2vid(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'txt2vid', and 'txt2img'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}