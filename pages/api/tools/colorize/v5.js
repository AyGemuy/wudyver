import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
class ImageColorizer {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.cfg = {
      baseUrlRest: "https://online.visual-paradigm.com/rest/baseUrl",
      aiUrl: "https://ai-services.visual-paradigm.com/api/deoldify/file",
      hdrs: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8",
        "cache-control": "no-cache",
        origin: "https://online.visual-paradigm.com",
        referer: "https://online.visual-paradigm.com/photo-effects-studio/photo-colorizer/",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    };
  }
  async getBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith?.("http")) {
        console.log("[Process] Downloading source image...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const raw = input?.includes?.("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(raw || "", "base64");
    } catch (e) {
      throw new Error(`Gagal memproses buffer gambar: ${e.message}`);
    }
  }
  async pre() {
    try {
      console.log("[Process] Fetching dynamic base URL...");
      const res = await this.api.get(this.cfg.baseUrlRest, {
        headers: this.cfg.hdrs
      });
      return res?.data?.trim?.() || "https://anonymous.vp-01.visual-paradigm.com/";
    } catch (e) {
      return "https://anonymous.vp-01.visual-paradigm.com/";
    }
  }
  async ini(base) {
    try {
      console.log("[Process] Initializing project session...");
      const url = `${base.replace(/\/$/, "")}/rest/diagrams/projects/init`;
      await this.api.get(url, {
        headers: this.cfg.hdrs
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  async up(buf) {
    try {
      console.log("[Process] Colorizing image via AI Service...");
      const form = new FormData();
      form.append("file", buf, {
        filename: "image.webp",
        contentType: "image/webp"
      });
      const res = await this.api.post(this.cfg.aiUrl, form, {
        headers: {
          ...this.cfg.hdrs,
          ...form.getHeaders()
        },
        responseType: "arraybuffer"
      });
      return {
        buffer: Buffer.from(res.data),
        contentType: res.headers["content-type"] || "image/png"
      };
    } catch (e) {
      throw new Error(`AI Service Error: ${e.message}`);
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("[Process] Starting Visual Paradigm AI Task...");
      const sourceBuf = await this.getBuf(imageUrl);
      const dynamicBase = await this.pre();
      await this.ini(dynamicBase);
      const {
        buffer,
        contentType
      } = await this.up(sourceBuf);
      console.log("[Process] AI Colorization Success!");
      return {
        buffer: buffer,
        contentType: contentType,
        info: "Processed successfully"
      };
    } catch (e) {
      console.error("[Error]", e.message);
      return {
        error: e.message
      };
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
  const api = new ImageColorizer();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}