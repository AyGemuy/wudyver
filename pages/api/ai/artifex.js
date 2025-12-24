import axios from "axios";
import FormData from "form-data";
import {
  randomUUID
} from "crypto";
import apiConfig from "@/configs/apiConfig";
class ArtifexApi {
  constructor() {
    this.cfg = {
      base: "http://207.180.192.159:8080",
      up_host: `https://${apiConfig.DOMAIN_URL}/api/tools/upload`,
      auth: "Bearer VJYJGTX56ITKFNT8TZ2YT41VM5BEUJR064UPEBZ7",
      eps: {
        t2i: "/post/generate_image/",
        t2i_v2: "/post/generate_image2/",
        i2i: "/post/image_to_image/",
        t2v: "/texttovideo/",
        i2v: "/imagetovideo/",
        tts: "/tts/v2",
        ep: "/enhance-prompt-groq",
        sp: "/sanitized-prompt"
      },
      def: {
        model_img: "artifex",
        model_i2i: "nanobanana",
        model_vid: "Ltxv_13B_0_9_8_Distilled_FP8",
        model_ep: "llama-3.1-8b-instant",
        model_sp: "google/gemma-3-27b-it:free",
        w: 1280,
        h: 720,
        vid_w: 768,
        vid_h: 512
      }
    };
    this.sess = axios.create({
      baseURL: this.cfg.base,
      headers: {
        Authorization: this.cfg.auth,
        accept: "application/json"
      }
    });
  }
  async buf(src) {
    try {
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (src.startsWith("data:")) return Buffer.from(src.split(",")[1], "base64");
        if (src.startsWith("http")) {
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(src, "base64");
      }
    } catch (e) {
      console.log("! buffer err:", e.message);
    }
    return null;
  }
  async up(content, filename = "file.bin") {
    const t = Date.now();
    console.log(`-> upload ${filename}...`);
    try {
      const buffer = await this.buf(content);
      if (!buffer) return null;
      const form = new FormData();
      form.append("file", buffer, filename);
      const res = await axios.post(this.cfg.up_host, form, {
        headers: form.getHeaders()
      });
      console.log(`<- uploaded (${Date.now() - t}ms)`);
      return res.data?.result || res.data || null;
    } catch (e) {
      console.log("! upload failed:", e.message);
      return null;
    }
  }
  async req(method, path, data, headers = {}) {
    const t = Date.now();
    console.log(`-> ${method} ${path}`);
    try {
      const res = await this.sess({
        method: method,
        url: path,
        data: data,
        headers: {
          ...headers
        }
      });
      console.log(`<- ${res?.status} (${Date.now() - t}ms)`);
      return res?.data;
    } catch (e) {
      console.log(`! req err: ${e.message}`);
      return {
        error: true,
        msg: e.message,
        data: e.response?.data
      };
    }
  }
  async generate({
    mode = "txt2img",
    prompt,
    text,
    imageUrl,
    v2 = false,
    ...rest
  }) {
    try {
      const uid = rest.user_id || randomUUID();
      const did = rest.device_id || randomUUID();
      const {
        eps,
        def
      } = this.cfg;
      let act = mode;
      if (imageUrl && mode === "txt2img") act = "img2img";
      if (imageUrl && mode === "txt2vid") act = "img2vid";
      const validator = {
        e_prompt: {
          required: ["prompt"]
        },
        s_prompt: {
          required: ["prompt"]
        },
        tts: {
          required: ["text"]
        },
        txt2img: {
          required: ["prompt"]
        },
        txt2vid: {
          required: ["prompt"]
        },
        img2img: {
          required: ["imageUrl"]
        },
        img2vid: {
          required: ["imageUrl"]
        }
      };
      if (!validator[act]) {
        return {
          status: false,
          message: `Invalid mode: '${act}'. Available modes: ${Object.keys(validator).join(", ")}`
        };
      }
      const missing = [];
      const reqFields = validator[act].required;
      if (reqFields.includes("prompt") && !prompt) missing.push("prompt");
      if (reqFields.includes("text") && !text) missing.push("text");
      if (reqFields.includes("imageUrl")) {
        if (!imageUrl || Array.isArray(imageUrl) && imageUrl.length === 0) {
          missing.push("imageUrl");
        }
      }
      if (missing.length > 0) {
        return {
          status: false,
          message: `Validation failed for mode '${act}'. Input required: ${missing.join(", ")}`
        };
      }
      console.log(`=== GEN [${act}] v2:${v2} ===`);
      const imgs = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
      let result = null;
      const results = [];
      switch (act) {
        case "e_prompt": {
          const pay = {
            prompt: prompt,
            model: rest.model || def.model_ep
          };
          result = await this.req("POST", eps.ep, pay);
          break;
        }
        case "s_prompt": {
          const pay = {
            prompt: prompt,
            model: rest.model || def.model_sp
          };
          result = await this.req("POST", eps.sp, pay);
          break;
        }
        case "tts": {
          const pay = {
            input: {
              text: text,
              speaker: rest.speaker || 1,
              device_id: did,
              user_id: uid
            }
          };
          result = await this.req("POST", eps.tts, pay);
          const b64Audio = result?.output?.output?.audio_base64;
          if (b64Audio) {
            const url = await this.up(b64Audio, "audio.mp3");
            if (url) result.output = url;
          }
          break;
        }
        case "txt2img": {
          const ep = v2 ? eps.t2i_v2 : eps.t2i;
          const pay = {
            enhance: rest.enhance ?? true,
            sanitize: rest.sanitize ?? true,
            sanitize_feed: rest.sanitize_feed ?? true,
            negative_prompt: rest.negative_prompt || "",
            style: rest.style || "",
            prompt: prompt,
            width: rest.width || def.w,
            height: rest.height || def.h,
            model: rest.model || def.model_img,
            user_id: uid,
            device_id: did
          };
          result = await this.req("POST", ep, pay);
          if (result?.image && typeof result.image === "string") {
            const url = await this.up(result.image, "image.jpg");
            if (url) result.image = url;
          }
          break;
        }
        case "txt2vid": {
          const pay = {
            sanitize: rest.sanitize ?? true,
            negative_prompt: rest.negative_prompt || "",
            style: rest.style || "",
            prompt: prompt,
            width: rest.width || def.vid_w,
            height: rest.height || def.vid_h,
            model: rest.model || def.model_vid,
            seed: rest.seed ?? 0,
            steps: rest.steps || 1,
            guidance: rest.guidance || 0,
            frames: rest.frames || 120,
            fps: rest.fps || 30,
            user_id: uid,
            device_id: did
          };
          result = await this.req("POST", eps.t2v, pay);
          break;
        }
        case "img2img": {
          for (const src of imgs) {
            const b = await this.buf(src);
            if (!b) continue;
            const form = new FormData();
            form.append("is_premium", String(rest.is_premium || false));
            form.append("prompt", prompt || "enhance");
            form.append("device_id", did);
            form.append("width", String(rest.width || 1024));
            form.append("height", String(rest.height || 1024));
            form.append("model", rest.model || def.model_i2i);
            form.append("negative_prompt", rest.negative_prompt || "");
            form.append("user_id", uid);
            form.append("is_sanitize", String(rest.is_sanitize ?? true));
            form.append("image", b, {
              filename: "i.jpg",
              contentType: "image/jpeg"
            });
            const res = await this.req("POST", eps.i2i, form, form.getHeaders());
            if (res?.image) {
              const url = await this.up(res.image, "result_i2i.jpg");
              if (url) res.image = url;
            }
            results.push(res);
          }
          break;
        }
        case "img2vid": {
          for (const src of imgs) {
            const b = await this.buf(src);
            if (!b) continue;
            const form = new FormData();
            form.append("prompt", prompt || "animate");
            form.append("device_id", "null");
            form.append("frames", String(rest.frames || 30));
            form.append("width", String(rest.width || 512));
            form.append("height", String(rest.height || 512));
            form.append("steps", String(rest.steps || 1));
            form.append("sanitize", String(rest.sanitize ?? true));
            form.append("fps", String(rest.fps || 30));
            form.append("model", rest.model || def.model_vid);
            form.append("negative_prompt", rest.negative_prompt || "");
            form.append("user_id", "null");
            form.append("seed", "null");
            form.append("guidance", String(rest.guidance || 0));
            form.append("first_frame_image", b, {
              filename: "f.jpg",
              contentType: "image/jpeg"
            });
            const res = await this.req("POST", eps.i2v, form, form.getHeaders());
            results.push(res);
          }
          break;
        }
      }
      if (["img2img", "img2vid"].includes(act)) {
        return results.length === 1 ? results[0] : results;
      }
      return result;
    } catch (e) {
      console.log("! fatal:", e.message);
      return {
        status: false,
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ArtifexApi();
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