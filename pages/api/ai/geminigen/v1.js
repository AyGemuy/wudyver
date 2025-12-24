import axios from "axios";
class GeminiGenAI {
  constructor() {
    this.axios = axios.create({
      baseURL: "https://api.geminigen.ai/uapi/v1",
      headers: {
        "x-api-key": "tts-7a511d204d4a3155569a788d9cfbb276"
      }
    });
    this.config = {
      tts: {
        endpoint: "/text-to-speech",
        defaults: {
          model: "tts-flash",
          speed: 1,
          output_format: "mp3"
        },
        validModels: ["tts-flash", "tts-pro"]
      },
      veo: {
        endpoint: "/video-gen/veo",
        defaults: {
          model: "veo-2",
          resolution: "720p",
          duration: 8,
          aspect_ratio: "16:9"
        },
        validModels: ["veo-3", "veo-3-fast", "veo-2"],
        validResolutions: ["720p", "1080p"],
        validRatios: ["16:9", "9:16"]
      },
      sora: {
        endpoint: "/video-gen/sora",
        defaults: {
          model: "sora-2",
          resolution: "small",
          duration: 10,
          aspect_ratio: "landscape"
        },
        validModels: ["sora-2", "sora-2-pro"],
        validDurations: [10, 15],
        validResolutions: ["small", "large"],
        validRatios: ["landscape", "portrait"]
      },
      img: {
        endpoint: "/generate_image",
        defaults: {
          model: "imagen-4",
          aspect_ratio: "1:1",
          style: "None"
        },
        validModels: ["imagen-flash", "imagen-4-fast", "imagen-4", "imagen-4-ultra"],
        validRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        validStyles: ["None", "3D Render", "Acrylic", "Anime General", "Creative", "Dynamic", "Fashion", "Game Concept", "Graphic Design 3D", "Illustration", "Photorealistic", "Portrait", "Portrait Cinematic", "Portrait Fashion", "Ray Traced", "Stock Photo", "Watercolor"]
      },
      histories: {
        endpoint: "/histories",
        defaults: {
          filter_by: "all",
          items_per_page: 10,
          page: 1
        }
      }
    };
  }
  validate(value, validOptions, defaultValue) {
    return validOptions?.includes(value) ? value : defaultValue;
  }
  async processFile(file) {
    try {
      if (Buffer.isBuffer(file)) return file;
      if (file?.startsWith?.("data:")) {
        const base64Data = file.split(",")[1] || file;
        return Buffer.from(base64Data, "base64");
      }
      if (file?.startsWith?.("http")) {
        console.log(`[INFO] Fetching image from URL: ${file}`);
        const res = await axios.get(file, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      return file;
    } catch (err) {
      console.error(`[ERROR] Failed to process file: ${err.message}`);
      throw err;
    }
  }
  async tts({
    model,
    text,
    voices,
    speed,
    output_format,
    ...rest
  } = {}) {
    try {
      console.log("[INFO] Starting TTS request...");
      const cfg = this.config.tts;
      const payload = {
        model: this.validate(model, cfg.validModels, cfg.defaults.model),
        input: text || rest.input,
        voices: voices || rest.voices,
        speed: speed ?? rest.speed ?? cfg.defaults.speed,
        output_format: output_format || rest.output_format || cfg.defaults.output_format,
        ...rest
      };
      console.log(`[INFO] Model: ${payload.model}, Format: ${payload.output_format}`);
      const res = await this.axios.post(cfg.endpoint, payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("[SUCCESS] TTS completed");
      return res.data;
    } catch (err) {
      console.error(`[ERROR] TTS failed: ${err?.response?.data?.message || err.message}`);
      throw err;
    }
  }
  async veo({
    prompt,
    imageUrl,
    model,
    resolution,
    duration,
    aspect_ratio,
    ...rest
  } = {}) {
    try {
      console.log("[INFO] Starting Veo video generation...");
      const cfg = this.config.veo;
      const form = new FormData();
      form.append("prompt", prompt || rest.prompt);
      form.append("model", this.validate(model || rest.model, cfg.validModels, cfg.defaults.model));
      form.append("resolution", this.validate(resolution || rest.resolution, cfg.validResolutions, cfg.defaults.resolution));
      form.append("duration", duration ?? rest.duration ?? cfg.defaults.duration);
      form.append("aspect_ratio", this.validate(aspect_ratio || rest.aspect_ratio, cfg.validRatios, cfg.defaults.aspect_ratio));
      const files = imageUrl || rest.imageUrl || rest.files || rest.images || [];
      const fileList = Array.isArray(files) ? files : [files];
      for (const file of fileList) {
        if (file) {
          console.log("[INFO] Processing image file...");
          const buffer = await this.processFile(file);
          form.append("images", buffer, "image.jpg");
        }
      }
      console.log(`[INFO] Model: ${form.get("model")}, Resolution: ${form.get("resolution")}`);
      const res = await this.axios.post(cfg.endpoint, form, {
        headers: {
          ...form.getHeaders?.()
        }
      });
      console.log("[SUCCESS] Veo generation completed");
      return res.data;
    } catch (err) {
      console.error(`[ERROR] Veo failed: ${err?.response?.data?.message || err.message}`);
      throw err;
    }
  }
  async sora({
    prompt,
    imageUrl,
    model,
    resolution,
    duration,
    aspect_ratio,
    ...rest
  } = {}) {
    try {
      console.log("[INFO] Starting Sora video generation...");
      const cfg = this.config.sora;
      const form = new FormData();
      form.append("prompt", prompt || rest.prompt);
      form.append("model", this.validate(model || rest.model, cfg.validModels, cfg.defaults.model));
      form.append("resolution", this.validate(resolution || rest.resolution, cfg.validResolutions, cfg.defaults.resolution));
      form.append("duration", this.validate(duration ?? rest.duration, cfg.validDurations, cfg.defaults.duration));
      form.append("aspect_ratio", this.validate(aspect_ratio || rest.aspect_ratio, cfg.validRatios, cfg.defaults.aspect_ratio));
      const files = imageUrl || rest.imageUrl || rest.files || rest.images || [];
      const fileList = Array.isArray(files) ? files : [files];
      for (const file of fileList) {
        if (file) {
          console.log("[INFO] Processing image file...");
          const buffer = await this.processFile(file);
          form.append("images", buffer, "image.jpg");
        }
      }
      console.log(`[INFO] Model: ${form.get("model")}, Duration: ${form.get("duration")}s`);
      const res = await this.axios.post(cfg.endpoint, form, {
        headers: {
          ...form.getHeaders?.()
        }
      });
      console.log("[SUCCESS] Sora generation completed");
      return res.data;
    } catch (err) {
      console.error(`[ERROR] Sora failed: ${err?.response?.data?.message || err.message}`);
      throw err;
    }
  }
  async img({
    prompt,
    imageUrl,
    model,
    aspect_ratio,
    style,
    ...rest
  } = {}) {
    try {
      console.log("[INFO] Starting image generation...");
      const cfg = this.config.img;
      const form = new FormData();
      form.append("prompt", prompt || rest.prompt);
      form.append("model", this.validate(model || rest.model, cfg.validModels, cfg.defaults.model));
      form.append("aspect_ratio", this.validate(aspect_ratio || rest.aspect_ratio, cfg.validRatios, cfg.defaults.aspect_ratio));
      form.append("style", this.validate(style || rest.style, cfg.validStyles, cfg.defaults.style));
      const files = imageUrl || rest.imageUrl || rest.files || rest.images || [];
      const fileList = Array.isArray(files) ? files : [files];
      for (const file of fileList) {
        if (file) {
          console.log("[INFO] Processing reference image...");
          const buffer = await this.processFile(file);
          form.append("images", buffer, "ref.jpg");
        }
      }
      console.log(`[INFO] Model: ${form.get("model")}, Style: ${form.get("style")}`);
      const res = await this.axios.post(cfg.endpoint, form, {
        headers: {
          ...form.getHeaders?.()
        }
      });
      console.log("[SUCCESS] Image generation completed");
      return res.data;
    } catch (err) {
      console.error(`[ERROR] Image generation failed: ${err?.response?.data?.message || err.message}`);
      throw err;
    }
  }
  async histories({
    filter_by,
    items_per_page,
    page,
    ...rest
  } = {}) {
    try {
      console.log("[INFO] Fetching histories...");
      const cfg = this.config.histories;
      const params = {
        filter_by: filter_by || rest.filter_by || cfg.defaults.filter_by,
        items_per_page: items_per_page ?? rest.items_per_page ?? cfg.defaults.items_per_page,
        page: page ?? rest.page ?? cfg.defaults.page,
        ...rest
      };
      console.log(`[INFO] Filter: ${params.filter_by}, Page: ${params.page}`);
      const res = await this.axios.get(cfg.endpoint, {
        params: params
      });
      console.log(`[SUCCESS] Retrieved ${res.data?.items?.length || 0} items`);
      return res.data;
    } catch (err) {
      console.error(`[ERROR] Histories fetch failed: ${err?.response?.data?.message || err.message}`);
      throw err;
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new GeminiGenAI();
  try {
    let response;
    switch (action) {
      case "tts":
        if (!params.text && !params.input) {
          return res.status(400).json({
            error: "Parameter 'text' atau 'input' wajib diisi untuk action 'tts'."
          });
        }
        response = await api.tts(params);
        break;
      case "veo":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'veo'."
          });
        }
        response = await api.veo(params);
        break;
      case "sora":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'sora'."
          });
        }
        response = await api.sora(params);
        break;
      case "img":
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'img'."
          });
        }
        response = await api.img(params);
        break;
      case "histories":
      case "history":
        response = await api.histories(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'tts', 'veo', 'sora', 'img', 'histories'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: error?.response?.data?.message || error.message || "Terjadi kesalahan internal pada server.",
      details: error?.response?.data || null
    });
  }
}