import axios from "axios";
class MagicEraser {
  constructor(options = {}) {
    this.config = {
      uploadUrl: "https://apienhance.magiceraser.live/upload_v6",
      upscaleUrl: "https://apienhance.magiceraser.live/",
      timeout: options.timeout || 6e4
    };
    this.api = axios.create({
      timeout: this.config.timeout,
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
  async toBuf(input) {
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
        const b64 = input.includes("base64,") ? input.split(",")[1] : input;
        return Buffer.from(b64, "base64");
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  buildUploadHeader(buf, w, h) {
    const header = Buffer.alloc(4);
    header[0] = h >> 8 & 255;
    header[1] = h & 255;
    header[2] = w >> 8 & 255;
    header[3] = w & 255;
    return Buffer.concat([header, buf]);
  }
  parseSmartResult(data) {
    if (!data) return null;
    const jpg = data.indexOf(Buffer.from([255, 216, 255]));
    const png = data.indexOf(Buffer.from([137, 80, 78, 71]));
    const start = jpg !== -1 ? jpg : png !== -1 ? png : 0;
    return data.slice(start);
  }
  validate(options) {
    const errors = [];
    if (!options.imageUrl) {
      errors.push({
        field: "imageUrl",
        message: "Input gambar (URL/Buffer/Base64) diperlukan"
      });
    }
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  async generate(options = {}) {
    const {
      imageUrl,
      x4 = true,
      face = true,
      color = true,
      width = 1024,
      height = 1024
    } = options;
    try {
      this.log("init", "Validasi input enhance...");
      const validation = this.validate(options);
      if (!validation.isValid) {
        throw {
          status: "error",
          type: "VALIDATION_FAILED",
          details: validation.errors
        };
      }
      const imgBuf = await this.toBuf(imageUrl);
      if (!imgBuf) throw {
        status: "error",
        message: "Gagal mengonversi input gambar"
      };
      this.log("upload", "Step 1: Mengunggah gambar ke server gateway...");
      const uploadBody = this.buildUploadHeader(imgBuf, width, height);
      const uploadRes = await this.api.post(this.config.uploadUrl, uploadBody, {
        responseType: "arraybuffer"
      });
      const uuid = Buffer.from(uploadRes.data).slice(0, 16);
      if (uuid.length !== 16) {
        throw {
          status: "error",
          message: "Server tidak memberikan UUID valid",
          raw: uploadRes.data.toString()
        };
      }
      const modeSuffix = x4 ? "upscale_x4_v6" : "upscale_x2_v6";
      const fullUpscaleUrl = `${this.config.upscaleUrl}${modeSuffix}`;
      this.log("request", `Step 2: Menjalankan ${modeSuffix}...`, {
        face: face,
        color: color
      });
      const enhanceRes = await this.api.post(fullUpscaleUrl, uuid, {
        params: {
          enhance_face: face ? "true" : "false",
          enhance_color: color ? "true" : "false"
        },
        responseType: "arraybuffer"
      });
      const cleanBuffer = this.parseSmartResult(Buffer.from(enhanceRes.data));
      this.log("success", "Proses enhance selesai.", {
        size: cleanBuffer.length
      });
      return {
        status: "success",
        message: "Image enhanced successfully",
        buffer: cleanBuffer,
        contentType: "image/png"
      };
    } catch (err) {
      const errorMsg = err.status === "error" ? err : {
        status: "error",
        type: "API_ERROR",
        message: err.response?.data ? Buffer.from(err.response.data).toString() : err.message
      };
      this.log("error", "Gagal memproses enhance.", errorMsg);
      throw errorMsg;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
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