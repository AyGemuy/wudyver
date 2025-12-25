import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class NovaImg {
  constructor() {
    this.cfg = {
      base: "https://api.novaimg.io/api",
      poll: "/common/get",
      endpoints: {
        edit: "/image-generate/create/image-edit",
        remove: "/remove-bg/create/v2",
        upscale: "/img-upscaler/create/v2",
        swap: "/face-swap/create-poll"
      },
      required: {
        edit: ["prompt"],
        remove: ["imageUrl"],
        upscale: ["imageUrl"],
        swap: ["source", "target"]
      },
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        origin: "https://novaimg.io",
        referer: "https://novaimg.io/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      pollDelay: 3e3,
      maxRetries: 60
    };
  }
  async generate({
    mode,
    prompt,
    imageUrl,
    source,
    target,
    ...rest
  }) {
    try {
      console.log(`[NovaImg] Mode: ${mode}`);
      if (!mode) {
        return {
          success: false,
          message: 'Parameter "mode" is required'
        };
      }
      const ep = this.cfg.endpoints[mode];
      if (!ep) {
        return {
          success: false,
          message: `Invalid mode: "${mode}". Valid modes: ${Object.keys(this.cfg.endpoints).join(", ")}`
        };
      }
      const reqFields = this.cfg.required[mode] || [];
      const params = {
        prompt: prompt,
        imageUrl: imageUrl,
        source: source,
        target: target
      };
      for (const field of reqFields) {
        if (!params[field]) {
          return {
            success: false,
            message: `Parameter "${field}" is required for mode "${mode}"`
          };
        }
      }
      const form = new FormData();
      if (imageUrl) {
        const imgs = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        console.log(`[NovaImg] Adding ${imgs.length} image(s) to form`);
        for (const img of imgs) {
          const buf = await this.toBuf(img);
          const field = mode === "upscale" ? "image" : mode === "remove" ? "file" : "image_input";
          form.append(field, buf, `img.${this.getExt(buf)}`);
        }
      }
      if (mode === "edit" && prompt) form.append("prompt", prompt);
      if (mode === "swap") {
        const srcBuf = await this.toBuf(source);
        const tgtBuf = await this.toBuf(target);
        form.append("source_image", srcBuf, `src.${this.getExt(srcBuf)}`);
        form.append("target_image", tgtBuf, `tgt.${this.getExt(tgtBuf)}`);
        form.append("source", "nova");
      }
      Object.entries(rest || {}).forEach(([k, v]) => form.append(k, v));
      console.log(`[NovaImg] Creating task...`);
      const {
        data
      } = await axios.post(`${this.cfg.base}${ep}`, form, {
        headers: {
          ...this.cfg.headers,
          ...form.getHeaders()
        }
      });
      const tid = data?.data?.task_id;
      if (!tid) {
        return {
          success: false,
          message: "No task_id in API response"
        };
      }
      console.log(`[NovaImg] Task ID: ${tid}`);
      return await this.poll(tid);
    } catch (e) {
      console.error(`[NovaImg] Error:`, e.message);
      return {
        success: false,
        message: e.message
      };
    }
  }
  async poll(taskId) {
    try {
      for (let i = 0; i < this.cfg.maxRetries; i++) {
        console.log(`[NovaImg] Polling (${i + 1}/${this.cfg.maxRetries})...`);
        const {
          data
        } = await axios.get(`${this.cfg.base}${this.cfg.poll}`, {
          params: {
            job_id: taskId
          },
          headers: this.cfg.headers
        });
        const urls = data?.data?.image_url;
        if (urls?.length > 0) {
          console.log(`[NovaImg] Complete!`);
          return {
            success: true,
            taskId: taskId,
            result: urls
          };
        }
        await this.sleep(this.cfg.pollDelay);
      }
      return {
        success: false,
        message: "Polling timeout"
      };
    } catch (e) {
      console.error(`[NovaImg] Poll error:`, e.message);
      return {
        success: false,
        message: e.message
      };
    }
  }
  async toBuf(inp) {
    try {
      if (Buffer.isBuffer(inp)) return inp;
      if (inp.startsWith("data:")) {
        const b64 = inp.split(",")[1] || inp;
        return Buffer.from(b64, "base64");
      }
      if (inp.startsWith("http")) {
        const {
          data
        } = await axios.get(inp, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      return Buffer.from(inp, "base64");
    } catch (e) {
      throw new Error(`Failed to convert image: ${e.message}`);
    }
  }
  getExt(buf) {
    const sig = buf.slice(0, 4).toString("hex");
    if (sig.startsWith("89504e47")) return "png";
    if (sig.startsWith("ffd8")) return "jpg";
    if (sig.startsWith("47494638")) return "gif";
    if (sig.startsWith("52494646")) return "webp";
    return "jpg";
  }
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new NovaImg();
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