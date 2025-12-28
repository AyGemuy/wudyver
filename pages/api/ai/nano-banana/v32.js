import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 6e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
    this.registered = false;
    this.cfg = {
      base: "https://trynanobanana.ai",
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      folder: "wavespeed/uploads",
      pollDelay: 3e3,
      maxAttempts: 60,
      endpoints: {
        auth: "/api/auth/sign-up/email",
        checkin: "/api/credits/daily-checkin",
        credits: "/api/credits",
        upload: "/api/storage/upload",
        nano: {
          gen: "/api/ai/image/nano-banana/generate",
          status: "/api/ai/image/nano-banana/status"
        },
        wavespeed: {
          "text-to-image": "/api/ai/image/wavespeed/text-to-image",
          "image-edit": "/api/ai/image/wavespeed/image-edit",
          "text-to-video": "/api/ai/video/wavespeed/text-to-video",
          "image-to-video": "/api/ai/video/wavespeed/image-to-video",
          "video-edit": "/api/ai/video/wavespeed/video-edit",
          "wan-animate": "/api/ai/video/wavespeed/wan-animate",
          status: "/api/ai/video/wavespeed/status"
        }
      }
    };
  }
  _log(step, msg, type = "info") {
    const icons = {
      info: "🔹",
      error: "❌",
      warn: "⚠️",
      success: "✅"
    };
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} ${icons[type] || "🔹"} [${step.toUpperCase()}] ${msg}`);
  }
  async autoRegister() {
    try {
      this._log("auth", "Memulai registrasi akun baru...");
      const {
        data: mailRes
      } = await axios.get(`${this.cfg.mail}?action=create`);
      const email = mailRes.email;
      if (!email) throw new Error("Gagal mengambil email sementara.");
      this._log("auth", `Email terbuat: ${email}`);
      await this.client.post(`${this.cfg.base}${this.cfg.endpoints.auth}`, {
        email: email,
        password: email,
        name: email.split("@")[0],
        callbackURL: "/"
      }, {
        headers: {
          origin: this.cfg.base,
          referer: `${this.cfg.base}/auth/sign-up`
        }
      });
      this._log("auth", "Menunggu email verifikasi...");
      let verifyLink = null;
      for (let i = 0; i < this.cfg.maxAttempts; i++) {
        const {
          data: inbox
        } = await axios.get(`${this.cfg.mail}?action=message&email=${email}`);
        const match = (inbox?.data?.[0]?.text_content || "").match(/https:\/\/trynanobanana\.ai\/api\/auth\/verify-email\?token=[^\s]+/);
        if (match) {
          verifyLink = match[0];
          break;
        }
        await new Promise(r => setTimeout(r, this.cfg.pollDelay));
      }
      if (!verifyLink) throw new Error("Link verifikasi tidak ditemukan (Timeout).");
      await this.client.get(verifyLink);
      this._log("auth", "Email berhasil diverifikasi.");
      const {
        data: status
      } = await this.client.get(`${this.cfg.base}${this.cfg.endpoints.checkin}`);
      if (status.canCheckIn) {
        await this.client.post(`${this.cfg.base}${this.cfg.endpoints.checkin}`, {}, {
          headers: {
            "content-length": "0"
          }
        });
        this._log("auth", "Daily check-in berhasil.");
      }
      this.registered = true;
      this._log("auth", `Siap digunakan. Saldo: ${await this.getCredits()} Credits.`, "success");
      return true;
    } catch (e) {
      this._log("auth", `Gagal: ${e.response?.data?.message || e.message}`, "error");
      throw e;
    }
  }
  async getCredits() {
    try {
      const {
        data
      } = await this.client.get(`${this.cfg.base}${this.cfg.endpoints.credits}`);
      return data.credits || 0;
    } catch (e) {
      return 0;
    }
  }
  async upload(input) {
    if (!input) return null;
    if (typeof input === "string" && input.includes("anyvideo.ai")) return input;
    try {
      let buffer;
      if (Buffer.isBuffer(input)) buffer = input;
      else if (input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(res.data);
      } else if (input.startsWith("data:")) {
        buffer = Buffer.from(input.split(",")[1], "base64");
      } else throw new Error("Format input tidak dikenali.");
      const form = new FormData();
      form.append("file", buffer, {
        filename: `media_${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      form.append("folder", this.cfg.folder);
      const {
        data
      } = await this.client.post(`${this.cfg.base}${this.cfg.endpoints.upload}`, form, {
        headers: form.getHeaders()
      });
      this._log("upload", "Media berhasil diunggah.");
      return data.url;
    } catch (e) {
      this._log("upload", `Gagal: ${e.message}`, "error");
      return null;
    }
  }
  async poll(taskId, hub) {
    const url = hub === "nano" ? `${this.cfg.base}${this.cfg.endpoints.nano.status}/${taskId}` : `${this.cfg.base}${this.cfg.endpoints.wavespeed.status}?taskId=${taskId}`;
    for (let i = 0; i < this.cfg.maxAttempts; i++) {
      try {
        const {
          data
        } = await this.client.get(url);
        const res = data.data || data;
        this._log("poll", `Tugas: ${taskId.slice(0, 8)}... | Status: ${res.status} (${i + 1})`);
        if (["completed", "done", "success"].includes(res.status)) {
          return res.urls || res.output?.urls || [res.url];
        }
        if (res.status === "failed") throw new Error(res.error || "Server merepresentasikan kegagalan.");
        await new Promise(r => setTimeout(r, this.cfg.pollDelay));
      } catch (e) {
        if (i === this.cfg.maxAttempts - 1) throw e;
        await new Promise(r => setTimeout(r, this.cfg.pollDelay));
      }
    }
    throw new Error("Polling Timeout.");
  }
  async generate({
    type = "text-to-image",
    model = null,
    prompt = "",
    imageUrl = null,
    videoUrl = null,
    aspect_ratio = "4:3",
    resolution = "720p",
    duration = 5,
    ...rest
  }) {
    if (!this.registered) await this.autoRegister();
    try {
      const isVideo = ["text-to-video", "image-to-video", "video-edit", "wan-animate"].includes(type);
      const useNano = !isVideo && (!model || ["nano-banana", "seedream"].includes(model));
      const hub = useNano ? "nano" : "wavespeed";
      const endpoint = useNano ? this.cfg.endpoints.nano.gen : this.cfg.endpoints.wavespeed[type];
      this._log("hub", `Menggunakan HUB: ${hub.toUpperCase()} | Endpoint: ${endpoint}`, "success");
      let payload = {
        prompt: prompt.trim(),
        provider: "wavespeed",
        seed: rest.seed || -1,
        enable_prompt_expansion: rest.enable_prompt_expansion ?? true,
        negative_prompt: rest.negative_prompt || ""
      };
      if (hub === "nano") {
        payload.mode = imageUrl ? "image-editing" : "text-to-image";
        payload.num_images = rest.num_images || 1;
        payload.aspect_ratio = aspect_ratio;
        payload.output_format = "png";
        if (imageUrl) {
          const list = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
          const uploadedUrls = [];
          for (const img of list) {
            this._log("upload", `Sedang mengunggah media ${uploadedUrls.length + 1}/${list.length}...`);
            const url = await this.upload(img);
            if (url) {
              uploadedUrls.push(url);
            }
          }
          payload.image_urls = uploadedUrls;
        }
      } else {
        if (type === "text-to-video") {
          payload.size = rest.size || "1280*720";
          payload.duration = duration;
        } else if (type === "image-to-video") {
          payload.image = await this.upload(imageUrl);
          payload.model = model || "wan25";
          payload.resolution = resolution;
          payload.duration = duration;
          if (rest.lastImage) payload.last_image = await this.upload(rest.lastImage);
        } else if (type === "video-edit") {
          payload.video = await this.upload(videoUrl);
          payload.resolution = resolution;
          payload.videoDuration = duration;
        } else if (type === "wan-animate") {
          payload.image = await this.upload(imageUrl);
          payload.video = await this.upload(videoUrl);
          payload.mode = rest.mode || "animate";
          payload.resolution = resolution;
          payload.videoDuration = duration;
        }
      }
      const {
        data
      } = await this.client.post(`${this.cfg.base}${endpoint}`, payload);
      if (!data.taskId) throw new Error(data.error || "Gagal mendapatkan taskId.");
      this._log("task", `Task ID: ${data.taskId}. Memulai antrean...`);
      const results = await this.poll(data.taskId, hub);
      return {
        success: true,
        hub: hub,
        type: type,
        taskId: data.taskId,
        results: results
      };
    } catch (e) {
      this._log("gen", `Error: ${e.response?.data?.message || e.message}`, "error");
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}