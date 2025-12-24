import axios from "axios";
import FormData from "form-data";
class DailyAPI {
  constructor() {
    this.baseGhibli = "https://ghibli.dailymorningupdate.com";
    this.baseFace = "https://faceswap.dailymorningupdate.com";
  }
  log(msg, data = "") {
    console.log(`[LOG]: ${msg}`, data || "");
  }
  async buf(media) {
    try {
      if (!media) return null;
      if (Buffer.isBuffer(media)) return media;
      if (typeof media === "string" && media.startsWith("http")) {
        this.log("Unduh media...");
        const res = await axios.get(media, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof media === "string" && (media.includes("base64,") || media.length > 200)) {
        return Buffer.from(media.split(",").pop(), "base64");
      }
      return Buffer.from(media);
    } catch (e) {
      this.log("Gagal convert buffer", e.message);
      return null;
    }
  }
  async generate({
    mode,
    prompt,
    image,
    source,
    target,
    ...rest
  }) {
    const form = new FormData();
    const queue = [];
    let url = "";
    this.log(`Init mode: ${mode}`);
    try {
      if (!mode) {
        return {
          error: true,
          msg: "Mode harus diisi (ghibli/upscale/swap)"
        };
      }
      switch (mode) {
        case "ghibli":
          if (!prompt) {
            return {
              error: true,
              msg: "Field 'prompt' wajib untuk mode ghibli"
            };
          }
          url = `${this.baseGhibli}/texttoghibli`;
          queue.push({
            k: "prompt",
            v: prompt
          });
          queue.push({
            k: "height",
            v: rest?.height || 512
          });
          queue.push({
            k: "width",
            v: rest?.width || 512
          });
          break;
        case "upscale":
          if (!image) {
            return {
              error: true,
              msg: "Field 'image' wajib untuk mode upscale"
            };
          }
          url = `${this.baseFace}/upscale`;
          queue.push({
            k: "image",
            v: image,
            file: true
          });
          break;
        case "swap":
          if (!source) {
            return {
              error: true,
              msg: "Field 'source' wajib untuk mode swap"
            };
          }
          if (!target) {
            return {
              error: true,
              msg: "Field 'target' wajib untuk mode swap"
            };
          }
          url = `${this.baseFace}/swap_faces`;
          queue.push({
            k: "source",
            v: source,
            file: true
          });
          queue.push({
            k: "target",
            v: target,
            file: true
          });
          break;
        default:
          return {
            error: true,
              msg: `Mode '${mode}' tidak valid`
          };
      }
      for (const item of queue) {
        const val = item?.v;
        if (item.file) {
          this.log(`Proses buffer: ${item.k}`);
          const b = await this.buf(val);
          if (!b) {
            return {
              error: true,
              msg: `Gagal memproses media untuk ${item.k}`
            };
          }
          form.append(item.k, b, "req.jpg");
        } else {
          form.append(item.k, val);
        }
      }
      this.log(`POST ke ${url}`);
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      this.log("Respon API Asli:");
      console.log(res?.data);
      return this.processResponse(res.data, mode);
    } catch (e) {
      const errData = e?.response?.data || e?.message;
      this.log("Error Process:", errData);
      return {
        error: true,
        msg: errData
      };
    }
  }
  processResponse(data, mode) {
    try {
      if (data.error) {
        return {
          error: true,
          msg: data.msg || data.message
        };
      }
      let imageBuffer = null;
      let info = {};
      switch (mode) {
        case "ghibli":
          if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            imageBuffer = this.base64ToBuffer(data.images[0]);
            info = {
              imageCount: data.images.length,
              mode: "ghibli",
              ...Object.fromEntries(Object.entries(data).filter(([key]) => key !== "images"))
            };
          }
          break;
        case "upscale":
          if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            imageBuffer = this.base64ToBuffer(data.images[0]);
            info = {
              imageCount: data.images.length,
              mode: "upscale",
              ...Object.fromEntries(Object.entries(data).filter(([key]) => key !== "images"))
            };
          }
          break;
        case "swap":
          if (data.swapped_image) {
            imageBuffer = this.base64ToBuffer(data.swapped_image);
            info = {
              message: data.message,
              mode: "swap",
              ...Object.fromEntries(Object.entries(data).filter(([key]) => key !== "swapped_image"))
            };
          }
          break;
      }
      if (!imageBuffer) {
        return {
          error: true,
          msg: "Tidak ada gambar yang dihasilkan",
          rawData: data
        };
      }
      return {
        buffer: imageBuffer,
        success: true,
        ...info
      };
    } catch (e) {
      this.log("Error processing response:", e.message);
      return {
        error: true,
        msg: "Gagal memproses respons API",
        rawData: data
      };
    }
  }
  base64ToBuffer(base64String) {
    try {
      const base64Data = base64String.includes("base64,") ? base64String.split(",")[1] : base64String;
      return Buffer.from(base64Data, "base64");
    } catch (e) {
      this.log("Error converting base64 to buffer:", e.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.mode) {
    return res.status(400).json({
      error: true,
      message: "Parameter 'mode' is required (ghibli/upscale/swap)"
    });
  }
  try {
    const api = new DailyAPI();
    const result = await api.generate(params);
    if (result.error) {
      return res.status(400).json({
        error: true,
        message: result.msg
      });
    }
    if (result.success && result.buffer) {
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(result.buffer);
    }
    return res.status(200).json({
      success: true,
      message: "Operation completed successfully",
      mode: result.mode,
      ...result
    });
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal Server Error"
    });
  }
}