import axios from "axios";
class Video3AI {
  constructor() {
    this.key = "AIzaSyBHs6nwhECiBlGZ83aeGtpYCX6Jk1sk8Ok";
    this.base = "https://us-central1-video3-ai.cloudfunctions.net";
    this.token = null;
    this.userId = null;
    this.fcmToken = null;
    this.cfg = {
      ratios: ["21:9", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "1:1"],
      models: {
        image: ["nano-banana", "nano-banana-pro", "flux-2-flex", "seedream-v4"],
        video: ["sora-2", "kling-2.5", "veo-3", "veo3.1", "veo3.1-first-last-frame", "hailuo-02", "pixverse-v5", "seedance-1.0"]
      },
      engines: {
        "nano-banana": {
          t2i: "nano-banana",
          i2i: "nano-banana-edit"
        },
        "nano-banana-pro": {
          t2i: "nano-banana-pro",
          i2i: "nano-banana-pro-edit"
        },
        "flux-2-flex": {
          t2i: "flux-2-flex",
          i2i: "flux-2-flex-edit"
        },
        "seedream-v4": {
          t2i: "seedream-text-to-image",
          i2i: "seedream-edit"
        },
        "sora-2": {
          t2v: "sora-2-text-to-video",
          i2v: "sora-2-image-to-video"
        },
        "kling-2.5": {
          t2v: "kling-text-to-video",
          i2v: "kling-image-to-video"
        },
        "veo-3": {
          t2v: "veo3",
          i2v: "veo3-image-to-video"
        },
        "veo3.1": {
          t2v: "veo3.1",
          i2v: "veo3.1-image-to-video"
        },
        "veo3.1-first-last-frame": {
          i2v: "veo3.1-first-last-frame"
        },
        "hailuo-02": {
          t2v: "hailuo-02-text-to-video",
          i2v: "hailuo-02-image-to-video"
        },
        "pixverse-v5": {
          t2v: "pixverse-v5-text-to-video",
          i2v: "pixverse-v5-image-to-video"
        },
        "seedance-1.0": {
          t2v: "seedance-text-to-video",
          i2v: "seedance-image-to-video"
        }
      },
      templates: {
        subject_fever: {
          model: "pixverse-v5",
          effect: "Subject 3 Fever",
          type: "i2v",
          ratio: "16:9",
          res: "720p",
          cost: 80
        },
        muscle_effect: {
          model: "wan-effects",
          effect: "muscle",
          type: "i2v",
          ratio: "1:1",
          cost: 80
        },
        bicep_flex: {
          model: "pixverse-v5",
          effect: "The Bicep Flex",
          type: "i2v",
          ratio: "16:9",
          res: "720p",
          cost: 80
        },
        i_can_fly: {
          model: "pixverse-v5",
          effect: "I believe I can fly",
          type: "i2v",
          ratio: "16:9",
          res: "720p",
          cost: 80
        },
        mermaid: {
          model: "pixverse-v5",
          effect: "Fin-tastic Mermaid",
          type: "i2v",
          ratio: "16:9",
          res: "720p",
          cost: 80
        },
        orange_editorial: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        overhead_pov: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        beach_sunset: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        y2k: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        bridal: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        rain_scene: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        bald_head: {
          model: "seedance-1.0",
          type: "i2v",
          ratio: "16:9",
          res: "720p",
          cost: 80
        },
        rainy_night: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        snowy: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        fitness: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        yacht: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        explosion: {
          model: "seedance-1.0",
          type: "i2v",
          ratio: "16:9",
          res: "720p",
          cost: 80
        },
        boxing: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        vip_lounge: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        },
        baby_prank: {
          model: "nano-banana",
          type: "i2i",
          cost: 40
        }
      }
    };
    this.headers = {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
    };
  }
  genFcm() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let token = "";
    for (let i = 0; i < 152; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${token.slice(0, 22)}:APA91b${token.slice(22)}`;
  }
  async ensureToken() {
    if (this.token) {
      console.log("✓ Token tersedia");
      return this.token;
    }
    console.log("⟳ Membuat token baru...");
    await this.signup();
    return this.token;
  }
  async signup() {
    try {
      console.log("⟳ Signup akun...");
      const {
        data
      } = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.key}`, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: this.headers
      });
      this.token = data?.idToken || null;
      this.userId = data?.localId || null;
      this.fcmToken = this.genFcm();
      console.log(`✓ Signup berhasil: ${this.userId}`);
      await this.registerDevice();
      return {
        token: this.token,
        userId: this.userId
      };
    } catch (e) {
      console.error("✗ Signup gagal:", e?.response?.data || e.message);
      throw e;
    }
  }
  async registerDevice() {
    try {
      console.log("⟳ Register device...");
      await axios.post(`${this.base}/registerDeviceToken`, {
        data: {
          deviceType: "ANDROID",
          deviceId: this.fcmToken,
          token: this.fcmToken
        }
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "firebase-instance-id-token": this.fcmToken
        }
      });
      console.log("✓ Device registered");
      return true;
    } catch (e) {
      console.error("✗ Register device error:", e?.response?.data || e.message);
      return false;
    }
  }
  async profile() {
    try {
      await this.ensureToken();
      console.log("⟳ Mengambil profil...");
      const {
        data
      } = await axios.post(`${this.base}/getProfile`, {
        data: null
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "firebase-instance-id-token": this.fcmToken || this.genFcm()
        }
      });
      console.log("✓ Profil diterima");
      return {
        token: this.token,
        ...data?.result?.data
      };
    } catch (e) {
      console.error("✗ Profile error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async coin() {
    try {
      await this.ensureToken();
      console.log("⟳ Cek saldo koin...");
      const {
        data
      } = await axios.post(`${this.base}/checkCoinStatus`, {
        data: null
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "firebase-instance-id-token": this.fcmToken || this.genFcm()
        }
      });
      console.log(`✓ Saldo: ${data?.result?.data?.coinBalance || 0} koin`);
      return {
        token: this.token,
        ...data?.result?.data
      };
    } catch (e) {
      console.error("✗ Coin error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async dailyClaim() {
    try {
      await this.ensureToken();
      console.log("⟳ Claim daily checkin...");
      const {
        data
      } = await axios.post(`${this.base}/claimDailyCheckin`, {
        data: null
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "firebase-instance-id-token": this.fcmToken || this.genFcm()
        }
      });
      const credits = data?.result?.data?.credits_awarded || 0;
      console.log(`✓ Daily claim: +${credits} koin`);
      return {
        token: this.token,
        ...data?.result?.data
      };
    } catch (e) {
      console.error("✗ Daily claim error:", e?.response?.data || e.message);
      return {
        token: this.token,
        success: false,
        error: e.message
      };
    }
  }
  async rewardClaim(rewardId) {
    try {
      await this.ensureToken();
      console.log(`⟳ Claim reward: ${rewardId}...`);
      const {
        data
      } = await axios.post(`${this.base}/claimReward`, {
        data: {
          reward_id: rewardId
        }
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "firebase-instance-id-token": this.fcmToken || this.genFcm()
        }
      });
      const credits = data?.result?.data?.credits_awarded || 0;
      console.log(`✓ Reward claim: +${credits} koin`);
      return {
        token: this.token,
        ...data?.result?.data
      };
    } catch (e) {
      console.error(`✗ Reward ${rewardId} error:`, e?.response?.data || e.message);
      return {
        token: this.token,
        success: false,
        error: e.message
      };
    }
  }
  async claimAll() {
    try {
      console.log("⟳ Memulai claim semua reward...");
      await this.ensureToken();
      const rewards = ["app_install", "instagram_follow", "tiktok_follow", "notifications"];
      await this.dailyClaim();
      await new Promise(d => setTimeout(d, 1e3));
      for (const r of rewards) {
        await this.rewardClaim(r);
        await new Promise(d => setTimeout(d, 1e3));
      }
      const balance = await this.coin();
      console.log(`✓ Total saldo: ${balance?.coinBalance || 0} koin`);
      return balance;
    } catch (e) {
      console.error("✗ Claim all error:", e.message);
      throw e;
    }
  }
  models() {
    return {
      image: this.cfg.models.image,
      video: this.cfg.models.video,
      all: [...this.cfg.models.image, ...this.cfg.models.video]
    };
  }
  templates() {
    return Object.keys(this.cfg.templates).map(k => ({
      id: k,
      ...this.cfg.templates[k]
    }));
  }
  async upload(img) {
    try {
      await this.ensureToken();
      console.log("⟳ Upload gambar...");
      let base64 = img;
      if (Buffer.isBuffer(img)) {
        base64 = `data:image/jpeg;base64,${img.toString("base64")}`;
      } else if (img?.startsWith("http://") || img?.startsWith("https://")) {
        const res = await axios.get(img, {
          responseType: "arraybuffer"
        });
        base64 = `data:image/jpeg;base64,${Buffer.from(res.data).toString("base64")}`;
      } else if (!img?.startsWith("data:")) {
        throw new Error("Format image tidak valid. Gunakan URL, base64, atau Buffer");
      }
      const {
        data
      } = await axios.post(`${this.base}/uploadImage`, {
        data: {
          base64Image: base64
        }
      }, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "firebase-instance-id-token": this.fcmToken || this.genFcm()
        }
      });
      console.log("✓ Upload berhasil");
      return data?.result?.data?.url || null;
    } catch (e) {
      console.error("✗ Upload error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async generate({
    token,
    mode,
    prompt,
    image,
    template,
    ...rest
  }) {
    try {
      this.token = token || this.token;
      await this.ensureToken();
      await this.claimAll();
      let tmpl = this.cfg.templates[template] || null;
      if (tmpl) console.log(`✓ Template: ${template} (${tmpl.model})`);
      const isVideo = mode === "video" || mode?.includes("v") || tmpl?.type?.includes("v");
      const endpoint = isVideo ? "/generateVideo" : "/generatePhoto";
      console.log(`⟳ Generate ${isVideo ? "video" : "image"}...`);
      const modelId = rest?.modelId || rest?.model_id || tmpl?.model || (isVideo ? "seedance-1.0" : "nano-banana");
      let payload = {
        data: {}
      };
      if (image) {
        const url = await this.upload(image);
        if (isVideo) {
          payload.data = {
            duration: rest?.duration || 5,
            generationType: "image_to_video",
            modelId: modelId,
            imageUrl: url,
            aspectRatio: rest?.aspectRatio || rest?.aspect_ratio || tmpl?.ratio || "16:9",
            prompt: prompt || "animate this image",
            resolution: rest?.resolution || tmpl?.res || "720p",
            promptOptimizer: rest?.promptOptimizer ?? false,
            generateAudio: rest?.generateAudio ?? false
          };
          if (tmpl?.effect || rest?.effectType || rest?.effect_type) {
            payload.data.effectType = tmpl?.effect || rest?.effectType || rest?.effect_type;
          }
        } else {
          payload.data = {
            aspectRatio: rest?.aspectRatio || rest?.aspect_ratio || "auto",
            modelId: modelId,
            prompt: prompt || "enhance this image",
            outputFormat: rest?.outputFormat || "png",
            imageUrls: [url]
          };
          if (modelId === "nano-banana-pro" && rest?.resolution) {
            payload.data.resolution = rest.resolution;
          }
          if (modelId === "seedream-v4" && rest?.imageSize) {
            payload.data.imageSize = rest.imageSize;
          }
        }
      } else {
        if (isVideo) {
          payload.data = {
            duration: rest?.duration || (modelId === "hailuo-02" ? 6 : 5),
            generationType: "text_to_video",
            modelId: modelId,
            aspectRatio: rest?.aspectRatio || rest?.aspect_ratio || "16:9",
            prompt: prompt || "create a video",
            resolution: rest?.resolution || (modelId === "pixverse-v5" ? "540p" : modelId === "hailuo-02" ? "512P" : "720p"),
            promptOptimizer: rest?.promptOptimizer ?? false,
            generateAudio: rest?.generateAudio ?? false
          };
        } else {
          payload.data = {
            aspectRatio: rest?.aspectRatio || rest?.aspect_ratio || (modelId === "flux-2-flex" ? "4:3" : "1:1"),
            modelId: modelId,
            prompt: prompt || "create an image",
            outputFormat: rest?.outputFormat || (modelId === "flux-2-flex" || modelId === "seedream-v4" ? "jpeg" : "png")
          };
          if (modelId === "nano-banana-pro") {
            payload.data.resolution = rest?.resolution || "1K";
          }
          if (modelId === "seedream-v4") {
            payload.data.imageSize = rest?.imageSize || {
              width: 1536,
              height: 1536
            };
          }
        }
      }
      const {
        data
      } = await axios.post(`${this.base}${endpoint}`, payload, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "firebase-instance-id-token": this.fcmToken || this.genFcm()
        }
      });
      const result = data?.result?.data || {};
      console.log(`✓ Generate dimulai: ${result?.id}`);
      return {
        token: this.token,
        ...result
      };
    } catch (e) {
      console.error("✗ Generate error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async status({
    token,
    id,
    ...rest
  }) {
    try {
      this.token = token || this.token;
      await this.ensureToken();
      const jobId = id || rest?.job_id || rest?.jobId;
      if (!jobId) throw new Error("ID generation diperlukan");
      console.log(`⟳ Cek status: ${jobId}...`);
      const url = `https://firestore.googleapis.com/v1/projects/video3-ai/databases/(default)/documents/generations/${jobId}`;
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`,
          "x-goog-api-client": "gl-rn/23.7.0 fire/26.0.2"
        }
      });
      const fields = data?.fields || {};
      const status = fields?.status?.stringValue || "UNKNOWN";
      const progress = parseInt(fields?.progress?.integerValue || 0);
      const resultUrl = fields?.result_url?.stringValue || fields?.result_urls?.arrayValue?.values?.[0]?.stringValue || null;
      console.log(`✓ Status: ${status} (${progress}%)`);
      return {
        token: this.token,
        id: jobId,
        status: status,
        progress: progress,
        result_url: resultUrl,
        completed: status === "COMPLETED",
        error: fields?.error_message?.stringValue || null
      };
    } catch (e) {
      console.error("✗ Status error:", e?.response?.data || e.message);
      throw e;
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
      actions: ["models", "templates", "generate", "status"]
    });
  }
  const api = new Video3AI();
  try {
    let result;
    switch (action) {
      case "models":
        result = api.models();
        break;
      case "templates":
        result = api.templates();
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "robot opening eyes"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.token || !params.id) {
          return res.status(400).json({
            error: "Parameter 'token' dan 'id' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              id: "xxxxxxxxxx",
              token: "eyJhxxxxxxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["models", "templates", "generate", "status"]
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