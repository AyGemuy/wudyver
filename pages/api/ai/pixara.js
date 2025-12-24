import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class PixaraAPI {
  constructor() {
    this.tokens = {
      access: null,
      refresh: null
    };
    this.email = null;
    this.task_id = null;
    this.password = null;
    this.firstName = null;
    this.lastName = null;
    this.api = axios.create();
    this.cookies = "";
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.api.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.cookies = setCookieHeader.map(c => c.split(";")[0]).join("; ");
      }
      return response;
    }, error => Promise.reject(error));
    this.api.interceptors.request.use(config => {
      if (this.cookies) config.headers["cookie"] = this.cookies;
      return config;
    }, error => Promise.reject(error));
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
  async models({
    type = "txt2img"
  }) {
    try {
      let endpoint;
      switch (type) {
        case "txt2img":
          endpoint = "https://app.pixara.ai/api/image-generation/credits";
          break;
        case "txt2vid":
        case "img2vid":
          endpoint = "https://app.pixara.ai/api/generative-video/credits";
          break;
        default:
          throw new Error("Invalid type. Use: txt2img, txt2vid, or img2vid");
      }
      const response = await this.api.get(endpoint, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          referer: `https://app.pixara.ai/dashboard/${type === "txt2img" ? "ai-text-to-image" : "generative-text-to-video"}`,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        }
      });
      return {
        success: true,
        type: type,
        models: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type: type
      };
    }
  }
  async createEmail() {
    try {
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v18?action=create`);
      this.email = response.data.result.address;
      this.task_id = response.data.result.task_id;
      console.log("✅ Email created:", this.email);
      return this.email;
    } catch (error) {
      console.error("❌ Error creating email:", error.message);
      throw error;
    }
  }
  async register() {
    try {
      this.firstName = this.genName();
      this.lastName = this.genName();
      this.password = this.genPass();
      if (!this.email) await this.createEmail();
      const data = [this.firstName, this.lastName, this.email, this.password, this.password, "indonesia"];
      await this.api.post("https://app.pixara.ai/sign-up", data, {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "e3fb415365687f8ef68aa64bf339be44f9f81a51",
          origin: "https://app.pixara.ai",
          referer: "https://app.pixara.ai/sign-up",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...SpoofHead()
        }
      });
      console.log(`✅ Registered: ${this.firstName} ${this.lastName}`);
    } catch (error) {
      console.error("❌ Error registering account:", error.message);
      throw error;
    }
  }
  async getToken() {
    try {
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v18?action=message&task_id=${this.task_id}`);
      if (response.data.result?.emails?.length > 0) {
        const emailContent = response.data.result.emails[0].body;
        const tokenMatch = emailContent.match(/token=([^&\s]+)/);
        if (tokenMatch) {
          console.log("✅ Token extracted");
          return tokenMatch[1];
        }
      }
      throw new Error("Token not found");
    } catch (error) {
      console.error("❌ Error getting verification token:", error.message);
      throw error;
    }
  }
  async verify(token) {
    try {
      await this.api.post("https://app.pixara.ai/api/auth/verify-email", {
        token: token
      }, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://app.pixara.ai",
          referer: `https://app.pixara.ai/verify-email?token=${token}`,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...SpoofHead()
        }
      });
      console.log("✅ Email verified");
    } catch (error) {
      console.error("❌ Error verifying email:", error.message);
      throw error;
    }
  }
  async extractTokens() {
    try {
      if (this.cookies) {
        const cookies = this.cookies.split("; ");
        for (const cookie of cookies) {
          const [name, value] = cookie.split("=");
          if (name === "accessToken") this.tokens.access = value;
          else if (name === "refreshToken") this.tokens.refresh = value;
        }
        if (this.tokens.access && this.tokens.refresh) {
          console.log("✅ Tokens extracted");
          return this.tokens;
        }
      }
      throw new Error("Tokens not found");
    } catch (error) {
      console.error("❌ Error extracting tokens:", error.message);
      throw error;
    }
  }
  async txt2img({
    prompt,
    ...options
  }) {
    if (!prompt) throw new Error("Prompt is required");
    try {
      console.log("🚀 Starting txt2img...");
      const startTime = Date.now();
      await this.createEmail();
      await this.register();
      await this.sleep(1e4);
      const token = await this.getToken();
      await this.verify(token);
      await this.extractTokens();
      const model = "bytedance/seedream-3";
      const finalOptions = {
        prompt: prompt,
        model: model,
        stylePreset: "auto",
        outputFormat: "jpeg",
        aspectRatio: "16:9",
        size: "regular",
        guidanceScale: 7.5,
        seed: 0,
        ...options
      };
      const response = await this.api.post(`https://app.pixara.ai/api/image-generation/${model}`, finalOptions, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://app.pixara.ai",
          referer: "https://app.pixara.ai/dashboard/ai-text-to-image",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...SpoofHead()
        }
      });
      if (response.data.assetUrl) {
        console.log("✅ txt2img completed immediately!");
        return {
          success: true,
          status: "success",
          progress: 100,
          result: {
            imageUrl: response.data.assetUrl,
            thumbnailUrl: response.data.thumbnail,
            width: response.data.width,
            height: response.data.height,
            assetId: response.data.assetId
          },
          metadata: {
            prompt: prompt,
            model: model,
            ...finalOptions,
            type: "txt2img",
            processingTime: Date.now() - startTime
          }
        };
      } else {
        const taskData = {
          generationId: response.data.id,
          email: this.email,
          accessToken: this.tokens.access,
          refreshToken: this.tokens.refresh,
          cookies: this.cookies,
          timestamp: Date.now(),
          metadata: {
            prompt: prompt,
            model: model,
            ...finalOptions,
            type: "txt2img"
          }
        };
        const task_id = await this.enc(taskData);
        const models = await this.models({
          type: "txt2img"
        });
        console.log("✅ txt2img task initiated!");
        return {
          success: true,
          task_id: task_id,
          message: "Task initiated. Use status method to check progress.",
          metadata: {
            ...taskData.metadata,
            processingTime: Date.now() - startTime,
            ...models
          }
        };
      }
    } catch (error) {
      console.error("💥 txt2img failed:", error.message);
      return {
        success: false,
        error: error.message,
        task_id: null
      };
    }
  }
  async getUploadUrl(imageUrl) {
    try {
      const imageResponse = await axios.head(imageUrl);
      const contentType = imageResponse.headers["content-type"] || "image/jpeg";
      const extMap = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "image/bmp": ".bmp"
      };
      const ext = extMap[contentType.toLowerCase()] || ".jpg";
      const uuid = this.genUUID();
      const key = `user-uploaded-assets/${uuid}${ext}`;
      const response = await this.api.post("https://app.pixara.ai/api/presign/upload", {
        contentType: contentType,
        key: key
      }, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://app.pixara.ai",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...SpoofHead()
        }
      });
      console.log("✅ Upload URL obtained");
      return {
        signedUrl: response.data,
        key: key,
        contentType: contentType
      };
    } catch (error) {
      console.error("❌ Error getting upload URL:", error.message);
      throw error;
    }
  }
  async uploadImg(presignedUrl, imageUrl, contentType) {
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 3e4
      });
      const buffer = Buffer.from(imageResponse.data);
      console.log(`✅ Image downloaded: ${buffer.length} bytes`);
      await axios.put(presignedUrl, buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": buffer.length.toString()
        },
        timeout: 6e4
      });
      console.log("✅ Image uploaded to S3");
      return true;
    } catch (error) {
      console.error("❌ Error uploading image:", error.message);
      throw error;
    }
  }
  async genVideo(options = {}) {
    try {
      const defaults = {
        model: "luma/ray-flash-2-720p",
        prompt: "a stunning fantasy landscape",
        duration: 5,
        concepts: [],
        aspectRatio: "9:16",
        loop: false
      };
      const videoOptions = {
        ...defaults,
        ...options
      };
      const response = await this.api.post("https://app.pixara.ai/api/generative-video/luma/ray-2/generate", videoOptions, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          origin: "https://app.pixara.ai",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...SpoofHead()
        }
      });
      console.log("✅ Video generation started");
      return response.data;
    } catch (error) {
      console.error("❌ Error generating video:", error.message);
      throw error;
    }
  }
  async checkStatus(generationId) {
    try {
      const response = await this.api.get(`https://app.pixara.ai/api/generative-video/generate/status/${generationId}`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          ...SpoofHead()
        }
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error checking status:", error.message);
      throw error;
    }
  }
  async img2vid({
    imageUrl,
    prompt = "transform to ghibli",
    ...rest
  }) {
    try {
      console.log("🚀 Starting img2vid...");
      const defaults = {
        model: "luma/ray-flash-2-720p",
        duration: 5,
        aspectRatio: "9:16",
        loop: false,
        maxRetries: 3,
        ...rest
      };
      const startTime = Date.now();
      await this.createEmail();
      await this.register();
      await this.sleep(1e4);
      const token = await this.getToken();
      await this.verify(token);
      await this.extractTokens();
      console.log("🔄 Uploading image...");
      const uploadData = await this.getUploadUrl(imageUrl);
      await this.uploadImg(uploadData.signedUrl, imageUrl, uploadData.contentType);
      console.log("🔄 Generating video...");
      const generation = await this.genVideo({
        prompt: prompt,
        startImageUrl: uploadData.key,
        model: defaults.model,
        duration: defaults.duration,
        aspectRatio: defaults.aspectRatio,
        loop: defaults.loop,
        concepts: defaults.concepts || []
      });
      const taskData = {
        generationId: generation.id,
        email: this.email,
        accessToken: this.tokens.access,
        refreshToken: this.tokens.refresh,
        cookies: this.cookies,
        timestamp: Date.now(),
        metadata: {
          prompt: prompt,
          model: defaults.model,
          duration: defaults.duration,
          aspectRatio: defaults.aspectRatio,
          imageUrl: uploadData.key,
          type: "img2vid"
        }
      };
      const task_id = await this.enc(taskData);
      const models = await this.models({
        type: "img2vid"
      });
      console.log("✅ img2vid initiated!");
      return {
        success: true,
        task_id: task_id,
        message: "Task initiated. Use status method to check progress.",
        metadata: {
          ...taskData.metadata,
          processingTime: Date.now() - startTime,
          ...models
        }
      };
    } catch (error) {
      console.error("💥 img2vid failed:", error.message);
      return {
        success: false,
        error: error.message,
        task_id: null
      };
    }
  }
  async txt2vid({
    prompt,
    ...rest
  }) {
    if (!prompt) return {
      success: false,
      error: "Prompt required",
      task_id: null
    };
    try {
      console.log("🚀 Starting txt2vid...");
      const defaults = {
        model: "luma/ray-flash-2-720p",
        duration: 5,
        aspectRatio: "9:16",
        loop: false,
        maxRetries: 3,
        ...rest
      };
      const startTime = Date.now();
      await this.createEmail();
      await this.register();
      await this.sleep(1e4);
      const token = await this.getToken();
      await this.verify(token);
      await this.extractTokens();
      console.log("🔄 Generating video from text...");
      const generation = await this.genVideo({
        prompt: prompt,
        model: defaults.model,
        duration: defaults.duration,
        aspectRatio: defaults.aspectRatio,
        loop: defaults.loop,
        concepts: defaults.concepts || []
      });
      const taskData = {
        generationId: generation.id,
        email: this.email,
        accessToken: this.tokens.access,
        refreshToken: this.tokens.refresh,
        cookies: this.cookies,
        timestamp: Date.now(),
        metadata: {
          prompt: prompt,
          model: defaults.model,
          duration: defaults.duration,
          aspectRatio: defaults.aspectRatio,
          type: "txt2vid"
        }
      };
      const task_id = await this.enc(taskData);
      const models = await this.models({
        type: "txt2vid"
      });
      console.log("✅ txt2vid initiated!");
      return {
        success: true,
        task_id: task_id,
        message: "Task initiated. Use status method to check progress.",
        metadata: {
          ...taskData.metadata,
          processingTime: Date.now() - startTime,
          ...models
        }
      };
    } catch (error) {
      console.error("💥 txt2vid failed:", error.message);
      return {
        success: false,
        error: error.message,
        task_id: null
      };
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) throw new Error("task_id required");
      const taskData = await this.dec(task_id);
      const {
        generationId,
        cookies,
        accessToken,
        refreshToken,
        metadata
      } = taskData;
      if (!generationId || !cookies) throw new Error("Invalid task_id");
      this.tokens.access = accessToken;
      this.tokens.refresh = refreshToken;
      this.cookies = cookies;
      const statusResponse = await this.checkStatus(generationId);
      if (statusResponse.status === "success" && statusResponse.progress === 100) {
        const result = {
          videoUrl: statusResponse.result.video,
          thumbnailUrl: statusResponse.result.videoThumbnail,
          videoSizeInBytes: statusResponse.result.videoSizeInBytes
        };
        return {
          status: "success",
          progress: 100,
          result: result,
          metadata: metadata
        };
      } else if (statusResponse.status === "processing" || statusResponse.progress < 100) {
        return {
          status: "processing",
          progress: statusResponse.progress || 0,
          message: "Processing...",
          metadata: metadata
        };
      } else {
        return {
          status: statusResponse.status || "failed",
          progress: statusResponse.progress || 0,
          message: "Task failed or unknown status",
          rawData: statusResponse,
          metadata: metadata
        };
      }
    } catch (error) {
      console.error("Status check error:", error);
      throw new Error(`Failed to check status: ${error.message}`);
    }
  }
  genUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c == "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  genName() {
    const names = ["Alex", "Jordan", "Casey", "Riley", "Morgan", "Avery", "Quinn", "Sage", "Taylor", "Parker", "Blake", "Cameron", "Drew", "Emery", "Finley", "Gray"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomId = Math.floor(Math.random() * 9999);
    return `${randomName}${randomId}`;
  }
  genPass(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ" [Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz" [Math.floor(Math.random() * 26)];
    password += "0123456789" [Math.floor(Math.random() * 10)];
    password += "!@#$%^&*" [Math.floor(Math.random() * 8)];
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password.split("").sort(() => Math.random() - .5).join("");
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action required: txt2img, txt2vid, img2vid, status, or models"
    });
  }
  const pixara = new PixaraAPI();
  try {
    switch (action) {
      case "models":
        const modelsResponse = await pixara.models(params);
        return res.status(200).json(modelsResponse);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt required for txt2img"
          });
        }
        const txt2imgResponse = await pixara.txt2img(params);
        return res.status(200).json(txt2imgResponse);
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt required for txt2vid"
          });
        }
        const txt2vidResponse = await pixara.txt2vid(params);
        return res.status(200).json(txt2vidResponse);
      case "img2vid":
        if (!params.imageUrl || !params.prompt) {
          return res.status(400).json({
            error: "imageUrl and prompt required for img2vid"
          });
        }
        const img2vidResponse = await pixara.img2vid(params);
        return res.status(200).json(img2vidResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id required for status"
          });
        }
        const statusResponse = await pixara.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported: txt2img, txt2vid, img2vid, status, models"
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}