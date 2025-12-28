import axios from "axios";
import FormData from "form-data";
import https from "https";
class AritekVideoGen {
  constructor() {
    this.cfg = {
      base: "https://text2video.aritek.app",
      auth: "eyJzdWIiwsdeOiIyMzQyZmczNHJ0MzR0weMzQiLCJuYW1lIjorwiSm9objJif4md3kbnG",
      sign: "61ed377e85d386a8dfee6b864bd85b0bfaa5af81",
      token: "skdjf20nx84D9KJf92fjdkJFslloqnxzmqt07",
      ver: "71",
      def: {
        style_code: 33,
        isPremium: 1,
        ctry_target: "others"
      }
    };
    this.deviceId = this.genId();
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
  }
  genHeaders(isJson = false) {
    const headers = {
      "User-Agent": "okhttp/5.1.0",
      Accept: "application/json",
      authorization: this.cfg.auth,
      sign: this.cfg.sign,
      pt: "",
      v: this.cfg.ver,
      deviceid: this.deviceId,
      Connection: "Keep-Alive"
    };
    if (isJson) headers["Content-Type"] = "application/json";
    return headers;
  }
  async pollVideoStatus(videoKey) {
    console.log(`[POLL START] Key: ${videoKey.substring(0, 30)}...`);
    const maxAttempts = 60;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const payload = {
          keys: [videoKey]
        };
        console.log(`[POLL] Attempt ${attempts + 1}/${maxAttempts}`);
        const response = await axios.post(`${this.cfg.base}/video`, JSON.stringify(payload), {
          headers: this.genHeaders(true),
          httpsAgent: this.httpsAgent
        });
        if (response.data.datas && response.data.datas.length > 0) {
          const videoData = response.data.datas[0];
          if (videoData.url && videoData.url.length > 0) {
            console.log(`[POLL SUCCESS] URL: ${videoData.url}`);
            return {
              status: "success",
              url: videoData.url,
              safe: videoData.safe,
              key: videoData.key
            };
          }
        }
        attempts++;
        await new Promise(r => setTimeout(r, 3e3));
      } catch (error) {
        console.error(`[POLL ERROR] ${error.message}`);
        if (error.response) {
          console.error(`[POLL ERROR] Status: ${error.response.status}`);
          console.error(`[POLL ERROR] Data:`, error.response.data);
        }
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Polling failed after ${maxAttempts} attempts: ${error.message}`);
        }
        await new Promise(r => setTimeout(r, 5e3));
      }
    }
    throw new Error("Timeout: Video generation exceeded 150 seconds");
  }
  async generate(options = {}) {
    const {
      mode = "video",
        prompt,
        media,
        style_code = this.cfg.def.style_code,
        aspect_ratio = "auto",
        ai_sound = 1
    } = options;
    if (!prompt) {
      throw new Error("Prompt is required");
    }
    const hasMedia = !!media;
    console.log(`[GENERATE] Mode: ${mode}, Media: ${hasMedia}, Prompt: "${prompt}"`);
    try {
      if (mode === "image") {
        return await this.generateImage(prompt, media, style_code, hasMedia);
      } else {
        return await this.generateVideo(prompt, media, style_code, aspect_ratio, ai_sound, hasMedia);
      }
    } catch (error) {
      console.error(`[GENERATE ERROR] ${error.message}`);
      if (error.response) {
        console.error(`[GENERATE ERROR] Status: ${error.response.status}`);
        console.error(`[GENERATE ERROR] Data:`, error.response.data);
      }
      throw error;
    }
  }
  async generateImage(prompt, media, style_code, hasMedia) {
    const endpoint = hasMedia ? "img2img" : "text2img";
    console.log(`[IMAGE] Endpoint: ${endpoint}`);
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style_code", style_code.toString());
    form.append("ctry_target", this.cfg.def.ctry_target);
    form.append("ver", this.cfg.ver);
    form.append("deviceID", this.deviceId);
    form.append("isPremium", this.cfg.def.isPremium.toString());
    form.append("verify_token", this.cfg.token);
    form.append("token", this.cfg.auth);
    if (hasMedia) {
      console.log(`[IMAGE] Processing input media...`);
      const buffer = await this.solveMedia(media);
      form.append("image", buffer, {
        filename: "input.jpg",
        contentType: "image/jpeg"
      });
    }
    const res = await axios.post(`${this.cfg.base}/${endpoint}`, form, {
      headers: {
        ...this.genHeaders(),
        ...form.getHeaders()
      },
      httpsAgent: this.httpsAgent
    });
    console.log(`[IMAGE SUCCESS] Response:`, res.data);
    return res.data;
  }
  async generateVideo(prompt, media, style_code, aspect_ratio, ai_sound, hasMedia) {
    const endpoint = hasMedia ? "img2video" : "txt2videov3";
    console.log(`[VIDEO] Endpoint: ${endpoint}`);
    const payload = {
      prompt: prompt,
      ver: parseInt(this.cfg.ver),
      deviceID: this.deviceId,
      isPremium: this.cfg.def.isPremium,
      ctry_target: this.cfg.def.ctry_target,
      used: [],
      aspect_ratio: aspect_ratio,
      ai_sound: ai_sound
    };
    if (hasMedia) {
      console.log(`[VIDEO] Processing input media...`);
      const buffer = await this.solveMedia(media);
      const mimeType = "image/png";
      payload.imageUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
    }
    const res = await axios.post(`${this.cfg.base}/${endpoint}`, JSON.stringify(payload), {
      headers: this.genHeaders(true),
      httpsAgent: this.httpsAgent
    });
    console.log(`[VIDEO] Initial response:`, res.data);
    if (res.data.key) {
      return await this.pollVideoStatus(res.data.key);
    }
    return res.data;
  }
  async solveMedia(media) {
    try {
      if (Buffer.isBuffer(media)) {
        console.log(`[MEDIA] Input is Buffer (${media.length} bytes)`);
        return media;
      }
      if (typeof media === "string") {
        if (media.startsWith("http")) {
          console.log(`[MEDIA] Downloading from URL: ${media}`);
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          console.log(`[MEDIA] Downloaded ${res.data.byteLength} bytes`);
          return Buffer.from(res.data);
        }
        console.log(`[MEDIA] Decoding base64 string`);
        return Buffer.from(media.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      throw new Error("Invalid media format");
    } catch (error) {
      console.error(`[MEDIA ERROR] ${error.message}`);
      throw error;
    }
  }
  genId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AritekVideoGen();
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