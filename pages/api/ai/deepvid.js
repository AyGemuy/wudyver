import axios from "axios";
import FormData from "form-data";
class DeepVidApi {
  constructor(token = null) {
    this.baseUrl = "https://deepvid.ai";
    this.token = token;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 12e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        Referer: "https://deepvid.ai/",
        Origin: "https://deepvid.ai"
      }
    });
  }
  _genFp() {
    return "fp-unified-" + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  async _ensureAuth() {
    if (this.token) return;
    console.log("🔐 [Auth] Token missing. Attempting Guest Login...");
    try {
      const response = await this.client.post("/api/auth/guest-login", {});
      if (response.data?.token || response.data?.jwtToken) {
        this.token = response.data.token || response.data.jwtToken;
        console.log(`✅ [Auth] Guest login success!`);
      } else {
        throw new Error("Failed to retrieve token.");
      }
    } catch (error) {
      console.error("❌ [Auth] Guest login failed:", error.message);
      throw error;
    }
  }
  async _resolveMedia(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) {
        return {
          data: input,
          filename: `upload_${Date.now()}.png`
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          console.log(`📥 [Media] Downloading from URL...`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const ext = res.headers["content-type"]?.split("/")[1] || "png";
          return {
            data: Buffer.from(res.data),
            filename: `downloaded_${Date.now()}.${ext}`
          };
        }
        if (input.startsWith("data:")) {
          const matches = input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].split("/")[1] || "png";
            return {
              data: Buffer.from(matches[2], "base64"),
              filename: `base64_${Date.now()}.${ext}`
            };
          }
        }
        if (input.length > 200 && !input.includes(" ")) {
          return {
            data: Buffer.from(input, "base64"),
            filename: `base64_raw_${Date.now()}.png`
          };
        }
      }
      return null;
    } catch (e) {
      console.error("❌ [Media] Failed to process media:", e.message);
      return null;
    }
  }
  async _buildFormData(payload) {
    const form = new FormData();
    const fileKeys = ["inputImage", "firstImage", "endImage", "initAudio"];
    for (const [key, value] of Object.entries(payload)) {
      if (value === null || value === undefined) continue;
      if (fileKeys.includes(key)) {
        const fileObj = await this._resolveMedia(value);
        if (fileObj) {
          form.append(key, fileObj.data, {
            filename: fileObj.filename
          });
          console.log(`   📎 [Form] Appended File for key: ${key} (${fileObj.filename})`);
        }
      } else if (typeof value === "boolean") {
        form.append(key, value ? "1" : "0");
      } else if (Array.isArray(value)) {
        value.forEach(v => form.append(key, v));
      } else {
        form.append(key, String(value));
      }
    }
    return form;
  }
  async models({
    token,
    mode = "image"
  }) {
    if (token) this.token = token;
    await this._ensureAuth();
    const headers = {
      Authorization: `Bearer ${this.token}`
    };
    let endpoint = "";
    if (mode === "image") endpoint = "/api/generate-image-v2/models";
    else if (mode === "video") endpoint = "/api/generate-video/models";
    else return {
      message: "Static models for audio"
    };
    try {
      const response = await this.client.get(endpoint, {
        headers: headers
      });
      let resultData = {
        success: true,
        type: mode,
        ...response.data
      };
      return {
        ...resultData,
        token: this.token
      };
    } catch (error) {
      return null;
    }
  }
  async media_list({
    token,
    page = 1,
    limit = 24,
    type = "",
    category = "",
    sort = "recommended",
    userId = "",
    ...params
  } = {}) {
    if (token) this.token = token;
    await this._ensureAuth();
    const headers = {
      Authorization: `Bearer ${this.token}`
    };
    try {
      const response = await this.client.get("/api/content/get-all-content", {
        headers: headers,
        params: {
          page: page,
          limit: limit,
          type: type,
          category: category,
          sort: sort,
          userId: userId,
          ...params
        }
      });
      let resultData = {
        success: true,
        ...response.data
      };
      return {
        ...resultData,
        token: this.token
      };
    } catch (error) {
      return null;
    }
  }
  async generate({
    token,
    mode = "image",
    ...params
  }) {
    if (token) this.token = token;
    const promptInput = params.prompt || params.userPrompt;
    if (!promptInput) throw new Error(`ValidationError: 'prompt' is required.`);
    await this._ensureAuth();
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "x-device-fingerprint": this._genFp()
    };
    let resultData = null;
    try {
      if (mode === "image") {
        resultData = await this._generateImage(promptInput, params, headers);
      } else if (mode === "video") {
        resultData = await this._generateVideo(promptInput, params, headers);
      } else if (mode === "audio") {
        resultData = await this._generateAudio(promptInput, params, headers);
      } else {
        throw new Error("Invalid mode.");
      }
    } catch (error) {
      console.error(`❌ [API Error] ${mode.toUpperCase()} Generation Failed:`);
      let errorDetails = error.message;
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data)}`);
        errorDetails = error.response.data;
      }
      resultData = {
        success: false,
        error: errorDetails
      };
    }
    return {
      ...resultData,
      token: this.token
    };
  }
  async _generateImage(prompt, params, headers) {
    console.log(`🎨 [Gen] Image: "${prompt}"...`);
    const payload = {
      userPrompt: prompt,
      model: params.model || "flux-schnell",
      aspectRatio: params.aspectRatio || "1:1",
      style: params.style || "realistic",
      negativePrompt: params.negativePrompt || "",
      enhancePrompt: params.enhancePrompt !== false,
      makePublic: params.makePublic !== false,
      inputImage: params.inputImage || null,
      seed: params.seed || null,
      is_mobile: true,
      ...params
    };
    const form = await this._buildFormData(payload);
    const response = await this.client.post("/api/generate-image-v2/image-generation", form, {
      headers: {
        ...headers,
        ...form.getHeaders()
      }
    });
    return {
      success: true,
      type: "image",
      ...response.data
    };
  }
  async _generateVideo(prompt, params, headers) {
    console.log(`🎥 [Gen] Video: "${prompt}"...`);
    const payload = {
      userPrompt: prompt,
      model: params.model || "kling_1.6_standard",
      duration: params.duration || "5",
      aspectRatio: params.aspectRatio || "16:9",
      negativePrompt: params.negativePrompt || "",
      cfgScale: params.cfgScale || .5,
      enhancePrompt: true,
      makePublic: false,
      is_mobile: true,
      firstImage: params.firstImage || null,
      endImage: params.endImage || null,
      ...params
    };
    const form = await this._buildFormData(payload);
    const response = await this.client.post("/api/generate-video/video-generation", form, {
      headers: {
        ...headers,
        ...form.getHeaders()
      }
    });
    return {
      success: true,
      type: "video",
      ...response.data
    };
  }
  async _generateAudio(prompt, params, headers) {
    console.log(`🎵 [Gen] Audio: "${prompt}"...`);
    const payload = {
      prompt: prompt,
      customLyrics: params.lyrics || prompt,
      customTitle: params.title || "Generated Song",
      style: params.style || "pop",
      negativeStyle: params.negativeStyle || "",
      isCustomMode: true,
      isInstrumentalMode: params.instrumental || false,
      makePublic: false,
      category: "jukebox",
      isApikey: "0",
      ...params
    };
    const response = await this.client.post("/api/generate-audio/jukebox", payload, {
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
    return {
      success: true,
      type: "audio",
      ...response.data
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["generate", "models", "media_list"]
    });
  }
  const api = new DeepVidApi();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "models":
        response = await api.models(params);
        break;
      case "media_list":
        response = await api.media_list(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["generate", "models", "media_list"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}