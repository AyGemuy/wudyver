import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
const SUPABASE_PROJECT = "gfoafqcjhfqigdwtxwqt";
const SUPABASE_URL = `https://${SUPABASE_PROJECT}.supabase.co`;
const MAIL_API = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
const HEADERS = {
  authority: "nanobananaimg.com",
  accept: "*/*",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmb2FmcWNqaGZxaWdkd3R4d3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTY1NDksImV4cCI6MjA3MDkzMjU0OX0.Qe1pmu-LTkQNqNjKEqcARyfqhtlL758eu2gakrz66Og",
  "content-type": "application/json",
  origin: "https://nanobananaimg.com",
  referer: "https://nanobananaimg.com/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "x-client-info": "supabase-ssr/0.6.1 createBrowserClient"
};
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: HEADERS,
      timeout: 12e4
    }));
    this.cfg = {
      base: "https://nanobananaimg.com",
      endpoints: {
        kie: "/api/image/kie/generate",
        fal: "/api/image/fal/generate",
        wavespeed: "/api/image/wavespeed/generate",
        byteplus: "/api/video/byteplus/generate",
        veo3: "/api/video/veo3/generate",
        videoKie: "/api/video/kie/generate",
        videoFal: "/api/video/fal/generate",
        videoWavespeed: "/api/video/wavespeed/generate"
      },
      models: {
        "nano-banana-pro": {
          type: "kie",
          category: "image",
          id: "nano-banana-pro"
        },
        "nano-banana": {
          type: "kie",
          category: "image",
          id: {
            text: "nano-banana",
            img: "nano-banana-edit"
          }
        },
        "seedream-v4-5": {
          type: "fal",
          category: "image",
          id: "seedream-v4-5"
        },
        seedream: {
          type: "fal",
          category: "image",
          id: "seedream-v4"
        },
        "z-image": {
          type: "fal",
          category: "image",
          id: "z-image"
        },
        "gpt-image-1-5": {
          type: "wavespeed",
          category: "image",
          id: "gpt-image-1-5"
        },
        "seedance1-5-pro": {
          type: "byteplus",
          category: "video",
          id: "seedance-1-5-pro"
        },
        seedance: {
          type: "byteplus",
          category: "video",
          id: "seedance-1-0-pro"
        },
        veo: {
          type: "veo3",
          category: "video",
          id: "veo3_fast"
        },
        sora: {
          type: "videoKie",
          category: "video",
          id: "sora2"
        },
        wan25: {
          type: "videoKie",
          category: "video",
          id: "wan25"
        },
        "wan-2-6": {
          type: "videoFal",
          category: "video",
          id: "wan-2-6"
        },
        kling26: {
          type: "videoWavespeed",
          category: "video",
          id: "kling-v2.6-pro"
        },
        kling25turbo: {
          type: "videoWavespeed",
          category: "video",
          id: "kling-v2.5-turbo-pro"
        },
        hailuo23: {
          type: "videoFal",
          category: "video",
          id: "hailuo-2-3-standard"
        },
        pixverse5: {
          type: "videoFal",
          category: "video",
          id: "pixverse-v5"
        }
      }
    };
    this.session = null;
    this.state = null;
  }
  listModels() {
    return this.cfg.models;
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  generatePKCE() {
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return {
      verifier: verifier,
      challenge: challenge
    };
  }
  async createMail() {
    try {
      const {
        data
      } = await axios.get(`${MAIL_API}?action=create`);
      return data?.email;
    } catch (e) {
      this.log("Mail Create Error: " + e.message, "ERROR");
      return null;
    }
  }
  async checkMail(email) {
    try {
      const {
        data
      } = await axios.get(`${MAIL_API}?action=message&email=${email}`);
      if (data?.data?.length > 0) {
        const text = data.data[0].text_content || "";
        const match = text.match(/token_hash=([a-zA-Z0-9_\-]+)/);
        return match ? match[1] : null;
      }
    } catch (e) {}
    return null;
  }
  async ensure(state) {
    try {
      if (state && state.startsWith("base64-")) {
        try {
          const jsonStr = Buffer.from(state.replace("base64-", ""), "base64").toString("utf-8");
          this.session = JSON.parse(jsonStr);
          this.state = state;
          this.client.defaults.headers["authorization"] = `Bearer ${this.session.access_token}`;
          const cookieName = `sb-${SUPABASE_PROJECT}-auth-token`;
          await this.jar.setCookie(`${cookieName}=${state}`, this.cfg.base);
          this.log("State restored successfully.");
          return state;
        } catch (e) {
          this.log("Invalid state format, logging in...", "WARN");
        }
      }
      this.log("Starting Auto Auth (PKCE Flow)...");
      const {
        verifier,
        challenge
      } = this.generatePKCE();
      const email = await this.createMail();
      if (!email) throw new Error("Failed to create temp mail");
      this.log(`Email: ${email}`);
      await this.client.post(`${SUPABASE_URL}/auth/v1/otp?redirect_to=https://nanobananaimg.com/auth/callback?next=/`, {
        email: email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: challenge,
        code_challenge_method: "s256"
      });
      this.log("OTP Requested. Waiting for mail...");
      let tokenHash = null;
      for (let i = 0; i < 60; i++) {
        await this.sleep(3e3);
        tokenHash = await this.checkMail(email);
        if (tokenHash) break;
      }
      if (!tokenHash) throw new Error("Timeout waiting for verification link");
      const verifyRes = await this.client.post(`${SUPABASE_URL}/auth/v1/verify?redirect_to=https://nanobananaimg.com/auth/callback?next=/`, {
        type: "email",
        token_hash: tokenHash,
        code_verifier: verifier
      });
      const session = verifyRes.data;
      if (!session?.access_token) throw new Error("Failed to retrieve access token");
      this.session = session;
      this.client.defaults.headers["authorization"] = `Bearer ${session.access_token}`;
      const sessionBase64 = Buffer.from(JSON.stringify(session)).toString("base64");
      const finalState = `base64-${sessionBase64}`;
      this.state = finalState;
      const cookieName = `sb-${SUPABASE_PROJECT}-auth-token`;
      await this.jar.setCookie(`${cookieName}=${finalState}`, this.cfg.base);
      this.log("Auth Success.");
      return finalState;
    } catch (e) {
      this.log(`Auth Error: ${e.response?.data?.msg || e.message}`, "ERROR");
      throw e;
    }
  }
  async solve(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (input.includes("base64,")) {
          return Buffer.from(input.split("base64,")[1], "base64");
        }
        return Buffer.from(input, "base64");
      }
    } catch (e) {
      this.log("Image solve failed: " + e.message, "WARN");
    }
    return null;
  }
  async upload(buffer, type = "image") {
    if (!buffer) return null;
    try {
      this.log(`Uploading ${buffer.length} bytes...`);
      const ext = type === "video" ? "mp4" : "jpg";
      const contentType = type === "video" ? "video/mp4" : "image/jpeg";
      const fileName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const datePath = new Date().toISOString().split("T")[0];
      const {
        data: signData
      } = await this.client.post(`${this.cfg.base}/api/upload/${type}/presigned-url`, {
        fileName: fileName,
        path: `${type}s/${datePath}`,
        contentType: contentType,
        fileSize: buffer.length
      });
      if (!signData?.signedUrl) throw new Error("No upload URL");
      await axios.put(signData?.signedUrl, buffer, {
        headers: {
          "Content-Type": contentType
        }
      });
      const publicUrl = signData?.url;
      this.log(`Upload OK: ${publicUrl}`);
      return publicUrl;
    } catch (e) {
      this.log("Upload failed: " + e.message, "ERROR");
      return null;
    }
  }
  async generate({
    state,
    prompt,
    image,
    video,
    model = "nano-banana-pro",
    poll = true,
    ...rest
  }) {
    try {
      const curState = await this.ensure(state);
      const mCfg = this.cfg.models[model] || this.cfg.models["nano-banana-pro"];
      let uploadedImages = undefined;
      let videoUrl = undefined;
      if (image) {
        const buf = await this.solve(image);
        const url = await this.upload(buf, "image");
        if (url) uploadedImages = [url];
      }
      if (video) {
        const buf = await this.solve(video);
        const url = await this.upload(buf, "video");
        if (url) videoUrl = url;
      }
      const isImg2Img = !!uploadedImages;
      const isVid2Vid = !!videoUrl;
      const isVideoModel = mCfg.category === "video";
      const endpoint = this.cfg.base + this.cfg.endpoints[mCfg.type];
      let apiModelId = mCfg.id;
      if (typeof mCfg.id === "object") {
        apiModelId = isImg2Img ? mCfg.id.img : mCfg.id.text;
      }
      let payload = {
        prompt: prompt,
        ...rest
      };
      if (isVideoModel) {
        const mode = isVid2Vid ? "video-to-video" : isImg2Img ? "image-to-video" : "text-to-video";
        const usesTypeKey = ["videoKie", "byteplus", "veo3"].includes(mCfg.type);
        if (usesTypeKey) {
          payload.type = mode;
        } else {
          payload.generateType = mode;
          payload.model = apiModelId;
        }
        if (uploadedImages) payload.imageUrls = uploadedImages;
        if (videoUrl) payload.videoUrl = videoUrl;
        if (mCfg.type === "videoKie") {
          if (model.includes("sora")) {
            const isPro = true;
            payload.modelNum = mode === "text-to-video" ? isPro ? 108 : 106 : isPro ? 109 : 107;
            payload.aspectRatio = rest.aspectRatio === "16:9" ? "landscape" : rest.aspectRatio === "9:16" ? "portrait" : "landscape";
            payload.duration = rest.duration || 5;
            payload.resolution = rest.resolution || "standard";
          } else if (model.includes("wan25")) {
            payload.modelNum = mode === "text-to-video" ? 104 : 105;
            payload.aspectRatio = rest.aspectRatio || "16:9";
            payload.duration = rest.duration || 5;
            payload.resolution = rest.resolution || "720p";
            if (rest.negativePrompt) payload.negativePrompt = rest.negativePrompt;
            if (rest.seed) payload.seed = parseInt(rest.seed);
          }
        } else if (mCfg.type === "byteplus") {
          payload.modelVersion = apiModelId;
          payload.aspectRatio = rest.aspectRatio || (mode === "image-to-video" ? "adaptive" : "16:9");
          payload.resolution = rest.resolution || "480p";
          payload.duration = rest.duration || 5;
          payload.imageMode = isImg2Img ? uploadedImages.length > 1 ? "dual" : "single" : undefined;
          payload.cameraFixed = rest.cameraFixed !== undefined ? rest.cameraFixed : false;
          if (rest.seed) payload.seed = parseInt(rest.seed);
        } else if (mCfg.type === "veo3") {
          payload.model = apiModelId;
          payload.aspectRatio = rest.aspectRatio || (mode === "image-to-video" ? "Auto" : "16:9");
        } else if (mCfg.type === "videoFal" || mCfg.type === "videoWavespeed") {
          payload.duration = rest.duration || 5;
          payload.ratio = rest.aspectRatio || (mode === "text-to-video" ? "16:9" : undefined);
          if (rest.negativePrompt) payload.negative_prompt = rest.negativePrompt;
          if (rest.seed) payload.seed = parseInt(rest.seed);
          if (model.includes("kling")) {
            payload.hasSound = rest.hasSound !== undefined ? rest.hasSound : true;
          }
        }
      } else {
        payload.generateType = isImg2Img ? "image-to-image" : "text-to-image";
        if (uploadedImages) payload.sourceImageUrls = uploadedImages;
        payload.modelId = apiModelId;
        payload.aspectRatio = rest.aspectRatio || "auto";
        if (mCfg.type === "kie") payload.resolution = rest.resolution || "2K";
        if (mCfg.type === "wavespeed") payload.quality = rest.quality || "medium";
        if (mCfg.type === "fal") payload.numImages = rest.numImages || 1;
      }
      this.log(`Task: [${payload.type || payload.generateType}] Model: ${model}`);
      const {
        data: genRes
      } = await this.client.post(endpoint, payload);
      if (!genRes?.success || !genRes?.taskId) {
        throw new Error(genRes?.message || genRes?.error || "Task creation failed");
      }
      const result = {
        success: true,
        ...genRes,
        state: curState,
        type: isVideoModel ? "video" : "image"
      };
      if (poll) {
        const taskId = genRes.taskId;
        const type = isVideoModel ? "video" : "image";
        this.log(`Polling started for Task: ${taskId} (Type: ${type})`);
        for (let i = 0; i < 60; i++) {
          await this.sleep(3e3);
          const statusRes = await this.status({
            state: curState,
            taskId: taskId,
            type: type
          });
          if (statusRes.success) {
            if (statusRes.status === "completed") {
              this.log(`Task ${taskId} completed.`);
              return {
                ...result,
                ...statusRes
              };
            }
            if (statusRes.status === "failed") {
              throw new Error(`Task failed: ${statusRes.failedReason || "Unknown Error"}`);
            }
            this.log(`Task ${taskId} status: ${statusRes.status} (${i + 1}/60)`);
          } else {
            this.log(`Polling error: ${statusRes.error}`, "WARN");
          }
        }
        throw new Error("Polling timeout: Task not completed after 180 seconds.");
      }
      return result;
    } catch (e) {
      this.log(e.message, "FATAL");
      return {
        success: false,
        error: e.message
      };
    }
  }
  async status({
    state,
    taskId,
    type = "image"
  }) {
    if (!taskId) return {
      success: false,
      error: "Task ID required"
    };
    try {
      const curState = await this.ensure(state);
      const isVideo = type === "video";
      const apiPath = isVideo ? "/api/video/task-status" : "/api/image/task-status";
      const url = `${this.cfg.base}${apiPath}?taskId=${taskId}`;
      const {
        data
      } = await this.client.get(url);
      return {
        success: true,
        ...data,
        state: curState
      };
    } catch (e) {
      this.log(`Status Check Error: ${e.message}`, "ERROR");
      return {
        success: false,
        error: e.message
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
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status", "models"],
      examples: {
        text_to_image: {
          action: "generate",
          prompt: "Beautiful sunset",
          model: "nano-banana-pro",
          poll: true
        },
        text_to_video: {
          action: "generate",
          prompt: "Cat dancing",
          model: "sora",
          poll: true
        },
        status: {
          action: "status",
          taskId: "...",
          state: "...",
          type: "video"
        }
      },
      note: "The 'generate' action auto-detects T2I/I2I/T2V/I2V based on model and image parameter"
    });
  }
  const api = new NanoBanana();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            available_models: api.listModels(),
            example: {
              action: "generate",
              prompt: "Your prompt here",
              model: "nano-banana-pro"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.state || !params.taskId) {
          return res.status(400).json({
            error: "Parameter 'state' dan 'taskId' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              state: "base64-xxxxxxxxx",
              taskId: "xxxxxxxxx",
              type: "image/video"
            }
          });
        }
        result = await api.status(params);
        break;
      case "models":
        result = api.listModels();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status", "models"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}