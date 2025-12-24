import axios from "axios";
import FormData from "form-data";
const BASE_URL = "https://api2.pixelcut.app";
const SUPPORTED_MODES = ["upscale", "outpaint", "shadow", "inpaint", "matte", "vision"];
class PixelcutAPI {
  constructor() {
    this.config = {
      baseUrl: BASE_URL,
      headers: {
        accept: "application/json",
        "x-client-version": "web",
        "x-locale": "es"
      },
      endpoints: {
        upscale: "/image/upscale/v1",
        outpaint: "/image/outpaint/v1",
        shadow: "/image/shadow/v1",
        inpaint: "/image/inpaint/v1",
        matte: "/image/matte/v1",
        vision: "/image/vision/v1"
      },
      imageRequired: {
        upscale: true,
        outpaint: true,
        shadow: true,
        inpaint: true,
        matte: true,
        vision: true
      },
      defaults: {
        outpaint: {
          creativity: "0.5",
          output_format: "jpeg"
        },
        inpaint: {
          option: 0
        },
        matte: {
          format: "png"
        },
        shadow: {
          estimate_lightmap: "true"
        },
        vision: {
          prompt: "Describe this image in detail"
        }
      }
    };
  }
  async generate({
    mode,
    imageUrl,
    image,
    file,
    maskUrl,
    mask,
    prompts,
    prompt,
    ...rest
  }) {
    if (!mode || !this.config.endpoints[mode]) {
      const available = SUPPORTED_MODES.join(", ");
      throw new Error(`Mode tidak valid. Pilihan: ${available}`);
    }
    const form = new FormData();
    const imgInput = imageUrl ?? image ?? file;
    const maskInput = maskUrl ?? mask;
    const endpoint = this.config.endpoints[mode];
    const url = `${this.config.baseUrl}${endpoint}`;
    const def = this.config.defaults[mode] ?? {};
    const imgReq = this.config.imageRequired[mode] ?? true;
    if (imgReq && !imgInput) {
      throw new Error('Parameter "imageUrl", "image", atau "file" wajib untuk mode ini');
    }
    if (imgInput) {
      const {
        data: img,
        name: fn
      } = await this._p(imgInput);
      form.append("image", img, {
        filename: fn
      });
    }
    if (maskInput) {
      const {
        data: m,
        name: mn
      } = await this._p(maskInput);
      form.append("mask", m, {
        filename: mn || "mask.png"
      });
    }
    if (mode === "outpaint") {
      const {
        left = 0,
          top = 0,
          right = 0,
          bottom = 0
      } = rest;
      if (left === 0 && top === 0 && right === 0 && bottom === 0) {
        rest.left = rest.top = rest.right = rest.bottom = 50;
      }
    }
    if (mode === "vision") {
      const finalPrompt = prompt || def.prompt;
      form.append("prompt", finalPrompt);
    }
    const payload = {
      ...def,
      ...rest
    };
    Object.entries(payload).forEach(([k, v]) => {
      if (v == null) return;
      if (k === "prompts" && Array.isArray(v)) {
        form.append("prompts", JSON.stringify(v.map(p => ({
          prompt: p
        }))));
      } else if (k !== "prompt") {
        if (typeof v !== "object") {
          form.append(k, String(v));
        }
      }
    });
    const headers = {
      ...form.getHeaders(),
      ...this.config.headers
    };
    const {
      data
    } = await axios.post(url, form, {
      headers: headers,
      timeout: 6e4
    });
    if (mode === "vision") {
      return {
        json: data
      };
    }
    let result;
    if (mode === "upscale" && data?.result_url) {
      const imgRes = await axios.get(data.result_url, {
        responseType: "arraybuffer"
      });
      result = Buffer.from(imgRes.data);
    } else if (typeof data === "string" && data.startsWith("data:image/")) {
      const [, b64] = data.split(";base64,");
      result = Buffer.from(b64, "base64");
    } else if (typeof data === "string" && data.includes("JFIF")) {
      result = Buffer.from(data, "binary");
    } else {
      result = Buffer.from(JSON.stringify(data));
    }
    const contentType = ["matte", "shadow"].includes(mode) ? "image/png" : "image/jpeg";
    return {
      buffer: result,
      contentType: contentType
    };
  }
  async _p(input) {
    if (Buffer.isBuffer(input)) return {
      data: input,
      name: "file.bin"
    };
    if (typeof input === "string" && input.startsWith("data:")) {
      const [, b64] = input.split(";base64,");
      const mime = input.match(/^data:(image\/[a-z+]+);/)?.[1] ?? "image/png";
      const ext = mime.split("/")[1].split("+")[0] ?? "png";
      return {
        data: Buffer.from(b64, "base64"),
        name: `file.${ext}`
      };
    }
    if (/^https?:\/\//i.test(input)) {
      const {
        data,
        headers
      } = await axios.get(input, {
        responseType: "arraybuffer"
      });
      const ct = headers["content-type"] ?? "image/png";
      const ext = ct.split("/").pop().split(";")[0] ?? "png";
      return {
        data: Buffer.from(data),
        name: `file.${ext}`
      };
    }
    throw new Error("Input tidak valid: gunakan URL, base64, atau Buffer");
  }
}
export default async function handler(req, res) {
  const {
    mode,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!mode) {
    return res.status(400).json({
      error: 'Parameter "mode" wajib diisi',
      available_modes: SUPPORTED_MODES
    });
  }
  if (!SUPPORTED_MODES.includes(mode)) {
    return res.status(400).json({
      error: `Mode "${mode}" tidak didukung`,
      available_modes: SUPPORTED_MODES
    });
  }
  try {
    const api = new PixelcutAPI();
    const result = await api.generate({
      mode: mode,
      ...params
    });
    if (result.json) {
      return res.status(200).json(result.json);
    }
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
      available_modes: SUPPORTED_MODES
    });
  }
}