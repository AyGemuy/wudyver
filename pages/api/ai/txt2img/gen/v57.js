import axios from "axios";
class MagicEraser {
  constructor(options = {}) {
    this.config = {
      baseUrl: "https://apiimagen.magiceraser.fyi/imagen_v1",
      stylesUrl: "https://media.magiceraser.live/imagen_style_templates.json",
      defaultSize: "1024x1024",
      defaultVersion: "flux"
    };
    this.stylesCache = null;
    this.api = axios.create({
      timeout: options.timeout || 6e4,
      headers: {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 12; Pixel 6 Build/SD1A.210817.036)",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/octet-stream"
      }
    });
  }
  log(step, msg, details = null) {
    const logObj = {
      timestamp: new Date().toISOString(),
      process: step.toUpperCase(),
      message: msg
    };
    if (details) logObj.details = details;
    console.log(JSON.stringify(logObj, null, 2));
  }
  async getStyles() {
    if (this.stylesCache) return this.stylesCache;
    try {
      this.log("validation", "Sinkronisasi template style...");
      const res = await axios.get(this.config.stylesUrl);
      this.stylesCache = res.data;
      return this.stylesCache;
    } catch (e) {
      this.log("error", "Gagal memuat template style", e.message);
      return [];
    }
  }
  async validate(options) {
    const errors = [];
    const {
      prompt,
      version,
      style,
      size
    } = options;
    if (!prompt || prompt.trim().length === 0) {
      errors.push({
        field: "prompt",
        message: "Prompt tidak boleh kosong"
      });
    }
    const validVersions = ["flux", "sdxl"];
    if (!validVersions.includes(version.toLowerCase())) {
      errors.push({
        field: "version",
        message: "Version harus FLUX atau SDXL"
      });
    }
    const validSizes = ["1024x1024", "1280x720", "720x1280", "1280x960", "960x1280", "1920x1080", "1080x1920"];
    if (size && !validSizes.includes(size)) {
      errors.push({
        field: "size",
        message: "Format resolusi tidak didukung"
      });
    }
    if (style && style !== "") {
      const availableStyles = await this.getStyles();
      const styleExists = availableStyles.some(s => s.key === style);
      if (!styleExists) {
        errors.push({
          field: "style",
          message: `Style '${style}' tidak ditemukan`,
          valid_options: availableStyles.slice(0, 5).map(s => s.key)
        });
      }
    }
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  parseBuffer(data) {
    if (!data) return null;
    const jpg = data.indexOf(Buffer.from([255, 216, 255]));
    const png = data.indexOf(Buffer.from([137, 80, 78, 71]));
    const start = jpg !== -1 ? jpg : png !== -1 ? png : 0;
    return data.slice(start);
  }
  async generate(options = {}) {
    const config = {
      prompt: options.prompt || "",
      negative_prompt: options.negativePrompt || "",
      size: options.size || this.config.defaultSize,
      style: options.style || "",
      custom_style: options.customStyle || "",
      version: (options.version || this.config.defaultVersion).toLowerCase()
    };
    try {
      this.log("init", "Memulai proses validasi...");
      const validation = await this.validate(config);
      if (!validation.isValid) {
        throw {
          status: "error",
          type: "VALIDATION_FAILED",
          message: "Input tidak valid",
          details: validation.errors
        };
      }
      this.log("request", "Mengirim payload ke server MagicEraser", config);
      const response = await this.api.post(this.config.baseUrl, null, {
        params: config,
        responseType: "arraybuffer"
      });
      const cleanBuffer = this.parseBuffer(Buffer.from(response.data));
      this.log("success", "Gambar berhasil dibuat", {
        size: cleanBuffer.length
      });
      return {
        status: "success",
        message: "Generation completed",
        buffer: cleanBuffer,
        contentType: "image/png"
      };
    } catch (err) {
      const errorMsg = err.status === "error" ? err : {
        status: "error",
        type: "API_ERROR",
        message: err.response?.data ? Buffer.from(err.response.data).toString() : err.message
      };
      this.log("error", "Terjadi kesalahan pada sistem", errorMsg);
      throw errorMsg;
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
  const api = new MagicEraser();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}