import axios from "axios";
import FormData from "form-data";
import {
  randomUUID,
  randomBytes,
  publicEncrypt,
  constants
} from "crypto";
import CryptoJS from "crypto-js";
import PROMPT from "@/configs/ai-prompt";
const PUB_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
const APP_ID = "aifaceswap";
const GID = "1H5tRtzsBkqXcaJ";
const FP = "817ddfb1-ea6c-4e07-b37d-3aa9281e4fb7";
class AniFun {
  constructor(baseURL = "https://anifun.ai") {
    this.ax = axios.create({
      baseURL: baseURL,
      withCredentials: true,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.api = "https://api.anifun.ai";
    this.axUpload = axios.create({
      baseURL: this.api,
      withCredentials: true,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  r16() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  uuid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ randomBytes(1)[0] & 15 >> c / 4).toString(16));
  }
  ts() {
    const e = new Date();
    const t = new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), e.getUTCHours(), e.getUTCMinutes(), e.getUTCSeconds());
    return Math.floor(t.getTime() / 1e3);
  }
  encAES(data, key, iv) {
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), CryptoJS.enc.Utf8.parse(key), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  }
  rsaEncrypt(data) {
    try {
      const encrypted = publicEncrypt({
        key: PUB_KEY,
        padding: constants.RSA_PKCS1_PADDING
      }, Buffer.from(data));
      return encrypted.toString("base64");
    } catch (e) {
      console.error("RSA encryption error:", e.message);
      throw e;
    }
  }
  sign() {
    try {
      const t = this.ts();
      const nonce = this.uuid();
      const aesKey = this.r16();
      const secret = this.rsaEncrypt(aesKey);
      const payload = `${APP_ID}:${GID}:${t}:${nonce}:${secret}`;
      const sign = this.encAES(payload, aesKey, aesKey);
      return {
        app_id: APP_ID,
        t: t,
        nonce: nonce,
        sign: sign,
        secret_key: secret,
        aesSecret: aesKey
      };
    } catch (e) {
      console.error("Sign generation error:", e.message);
      throw e;
    }
  }
  signux() {
    try {
      const t = this.ts();
      const nonce = this.uuid();
      const aesKey = this.r16();
      const secret = this.rsaEncrypt(aesKey);
      const payload = `${APP_ID}:${nonce}:${secret}`;
      const sign = this.encAES(payload, aesKey, aesKey);
      return {
        app_id: APP_ID,
        t: t,
        nonce: nonce,
        sign: sign,
        secret_key: secret,
        aesSecret: aesKey
      };
    } catch (e) {
      console.error("Signux generation error:", e.message);
      throw e;
    }
  }
  hdr(s = this.sign()) {
    return {
      "x-guide": s.secret_key,
      fp: FP,
      fp1: this.encAES(FP, s.aesSecret, s.aesSecret),
      "theme-version": "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q",
      "x-code": Date.now().toString()
    };
  }
  async up(img, fnName = "demo-photo2anime") {
    try {
      let file, name = "img.jpg";
      if (Buffer.isBuffer(img)) {
        file = img;
        name = `buf-${Date.now()}.jpg`;
      } else if (typeof img === "string") {
        if (img.startsWith("http")) {
          console.log("📥 Downloading image from URL...");
          const r = await axios.get(img, {
            responseType: "arraybuffer"
          });
          file = Buffer.from(r.data);
        } else if (img.startsWith("data:")) {
          file = Buffer.from(img.split(",")[1], "base64");
        } else {
          throw new Error("Only URL or data URI supported");
        }
      }
      if (!file) throw new Error("Invalid image format");
      const form = new FormData();
      form.append("file", file, {
        fileName: name,
        contentType: "image/jpeg"
      });
      form.append("fn_name", fnName);
      form.append("request_from", "16");
      form.append("origin_from", "68d425c58e76bc6c");
      console.log("⬆️ Uploading image...");
      const s = this.signux();
      const headers = {
        ...this.hdr(s),
        ...form.getHeaders(),
        "x-sign": s.sign,
        origin: "https://anifun.ai",
        referer: "https://anifun.ai/"
      };
      const res = await this.axUpload.post("/aitools/upload-img", form, {
        headers: headers
      });
      console.log("✅ Upload response:", res.data);
      return res.data?.data?.path;
    } catch (e) {
      console.error("❌ Upload error:", e.response?.data || e.message);
      throw e;
    }
  }
  async sub(type, data, fnName = "ai_body") {
    try {
      console.log("🚀 Submitting task, type:", type);
      const payload = {
        type: type,
        fn_name: fnName,
        input: {
          ...data,
          request_from: 16,
          origin_from: "68d425c58e76bc6c"
        }
      };
      const headers = {
        ...this.hdr(),
        "content-type": "application/json",
        origin: "https://anifun.ai",
        referer: "https://anifun.ai/app/ai-image-generator/"
      };
      const res = await this.ax.post("/api/v1/generation/app_create", payload, {
        headers: headers
      });
      console.log("📦 Submit response:", res.data);
      const taskId = res.data?.result?.task_id;
      if (!taskId) throw new Error("No task_id in response");
      console.log("🎯 Task submitted, ID:", taskId);
      return taskId;
    } catch (e) {
      console.error("❌ Submit task error:", e.response?.data || e.message);
      throw e;
    }
  }
  async poll(id, apiType = "generation", fnName = "demo-photo2anime") {
    console.log("🔄 Polling task:", id, "Type:", apiType, "FN:", fnName);
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 3e3));
      attempts++;
      try {
        let res;
        if (apiType === "generation") {
          res = await this.ax.get("/api/v1/generation/app_task_state", {
            params: {
              task_id: id
            },
            headers: this.hdr()
          });
          console.log(`📊 Poll ${attempts}/${maxAttempts} response:`, res.data);
          if (res.data.code === 200) {
            if (res.data.result && Array.isArray(res.data.result)) {
              const images = res.data.result;
              if (images.length > 0) {
                console.log("🎉 Task completed! Images:", images);
                const fullUrls = images.map(img => `https://temp.anifun.ai/${img}`);
                return {
                  code: 200,
                  result: images,
                  full_urls: fullUrls,
                  task_id: id
                };
              }
            } else if (res.data.result?.status === "completed" && res.data.result?.result_image) {
              console.log("🎉 Task completed! Images:", res.data.result.result_image);
              return res.data;
            }
          }
          console.log(`⏳ Status:`, res.data.result?.status || "pending", "Progress:", res.data.result?.progress || "?");
        } else {
          const payload = {
            task_id: id,
            fn_name: fnName,
            call_type: 3,
            request_from: 16,
            origin_from: "68d425c58e76bc6c"
          };
          const headers = {
            ...this.hdr(),
            "content-type": "application/json",
            origin: "https://anifun.ai",
            referer: "https://anifun.ai/"
          };
          res = await this.axUpload.post("/aitools/of/check-status", payload, {
            headers: headers
          });
          console.log(`📊 Poll ${attempts}/${maxAttempts} response:`, res.data);
          if (res.data.code === 200 && res.data.data) {
            if (res.data.data.status === 2 && res.data.data.result_image) {
              console.log("🎉 Task completed! Image:", res.data.data.result_image);
              const fullUrl = `https://temp.anifun.ai/${res.data.data.result_image}`;
              return {
                code: 200,
                data: {
                  status: res.data.data.status,
                  result_image: res.data.data.result_image,
                  full_url: fullUrl
                },
                task_id: id
              };
            } else if (res.data.data.status === 1) {
              console.log(`⏳ Processing... Status: ${res.data.data.status}, Queue: ${res.data.data.queue_len || "N/A"}, Rank: ${res.data.data.rank || "N/A"}`);
            } else if (res.data.data.status === 3) {
              throw new Error("Task failed");
            } else {
              console.log(`⏳ Waiting... Status: ${res.data.data.status}`);
            }
          } else if (res.data.code !== 200) {
            console.error("❌ Polling error:", res.data.message);
          }
        }
      } catch (e) {
        console.error(`❌ Poll error (attempt ${attempts}):`, e.response?.data || e.message);
      }
    }
    throw new Error(`⏰ Polling timeout after ${maxAttempts} attempts`);
  }
  async txt2img({
    prompt,
    negative_prompt = "(worst quality, low quality:1.4), (greyscale, monochrome:1.1), cropped, lowres , username, blurry, trademark, watermark, title, strabismus, clothing cutout, side slit,worst hand, (ugly face:1.2), extra leg, extra arm, bad foot, text, name, badhandv4, easynegative, EasyNegativeV2, negative_hand, ng_deepnegative_v1_75t",
    steps = 25,
    cfg = 7,
    seed = -1,
    batch_size = 1,
    model = {
      id: 518,
      name: "EvaClausMix Pony",
      modelType: "SDXL",
      preview: "https://animegenius-global.live3d.io/vtuber/ai_product/anime_genius/images/e8729c2f2317d35f0c3e64a2138f29d7.webp",
      fileName: "EvaClausMixPonyXL_v2.1.safetensors"
    },
    loras = [],
    size = "2:3",
    width = 836,
    height = 1253,
    ...rest
  }) {
    try {
      console.log("🎨 Starting txt2img...");
      const data = {
        prompt: prompt,
        negative_prompt: negative_prompt,
        steps: steps,
        cfg: cfg,
        seed: seed,
        batch_size: batch_size,
        model: model,
        loras: loras,
        size: size,
        width: width,
        height: height,
        ...rest
      };
      const taskId = await this.sub(1, data);
      const result = await this.poll(taskId, "generation");
      console.log("✅ txt2img completed successfully");
      return result;
    } catch (e) {
      console.error("❌ txt2img failed:", e.message);
      throw e;
    }
  }
  async img2img({
    prompt = PROMPT?.text || "anime style, masterpiece, best quality, high resolution",
    imageUrl,
    negative_prompt = "",
    ...rest
  }) {
    try {
      console.log("🖼️ Starting img2img...");
      const path = await this.up(imageUrl, "demo-photo2anime");
      console.log("✅ Image uploaded, path:", path);
      console.log("🚀 Submitting img2img task...");
      const payload = {
        fn_name: "demo-photo2anime",
        call_type: 3,
        input: {
          source_image: path,
          prompt: prompt,
          negative_prompt: negative_prompt,
          request_from: 16,
          origin_from: "68d425c58e76bc6c",
          ...rest
        }
      };
      const s = this.signux();
      const headers = {
        ...this.hdr(s),
        "content-type": "application/json",
        "x-sign": s.sign,
        origin: "https://anifun.ai",
        referer: "https://anifun.ai/"
      };
      const res = await this.axUpload.post("/aitools/of/create", payload, {
        headers: headers
      });
      console.log("📦 Img2img submit response:", res.data);
      const taskId = res.data?.data?.task_id;
      if (!taskId) {
        console.error("No task_id in response:", res.data);
        throw new Error("No task_id in aitools response");
      }
      console.log("🎯 img2img task submitted, ID:", taskId);
      const result = await this.poll(taskId, "aitools", "demo-photo2anime");
      console.log("✅ img2img completed successfully");
      return result;
    } catch (e) {
      console.error("❌ img2img failed:", e.response?.data || e.message);
      throw e;
    }
  }
  async txt2manga({
    prompt,
    style = "Manga",
    color_style = "full color,2panels\n, Keep the text font consistent with the original prompt's language system.\n",
    num_panels = 2,
    height = 768,
    width = 768,
    ...rest
  }) {
    try {
      console.log("📖 Starting txt2manga...");
      const payload = {
        fn_name: "demo-text2manga",
        call_type: 3,
        input: {
          prompt: prompt,
          style: style,
          color_style: color_style,
          num_panels: num_panels,
          height: height,
          width: width,
          request_from: 16,
          origin_from: "68d425c58e76bc6c",
          ...rest
        }
      };
      const s = this.signux();
      const headers = {
        ...this.hdr(s),
        "content-type": "application/json",
        "x-sign": s.sign,
        origin: "https://anifun.ai",
        referer: "https://anifun.ai/"
      };
      console.log("🚀 Submitting txt2manga task...");
      const res = await this.axUpload.post("/aitools/of/create", payload, {
        headers: headers
      });
      console.log("📦 txt2manga submit response:", res.data);
      const taskId = res.data?.data?.task_id;
      if (!taskId) {
        console.error("No task_id in response:", res.data);
        throw new Error("No task_id in txt2manga response");
      }
      console.log("🎯 txt2manga task submitted, ID:", taskId);
      console.log("📊 Queue info - Length:", res.data.data.queue_len, "Rank:", res.data.data.rank);
      const result = await this.poll(taskId, "aitools", "demo-text2manga");
      console.log("✅ txt2manga completed successfully");
      return result;
    } catch (e) {
      console.error("❌ txt2manga failed:", e.response?.data || e.message);
      throw e;
    }
  }
  async img2real({
    prompt = "(masterpiece), best quality",
    imageUrl,
    ...rest
  }) {
    try {
      console.log("🏞️ Starting img2real (Anime to Real)...");
      const path = await this.up(imageUrl, "demo-anime2real");
      console.log("✅ Image uploaded, path:", path);
      console.log("🚀 Submitting img2real task...");
      const payload = {
        fn_name: "demo-anime2real",
        call_type: 3,
        input: {
          source_image: path,
          prompt: prompt,
          request_from: 16,
          origin_from: "68d425c58e76bc6c",
          ...rest
        }
      };
      const s = this.signux();
      const headers = {
        ...this.hdr(s),
        "content-type": "application/json",
        "x-sign": s.sign,
        origin: "https://anifun.ai",
        referer: "https://anifun.ai/"
      };
      const res = await this.axUpload.post("/aitools/of/create", payload, {
        headers: headers
      });
      console.log("📦 img2real submit response:", res.data);
      const taskId = res.data?.data?.task_id;
      if (!taskId) {
        console.error("No task_id in response:", res.data);
        throw new Error("No task_id in img2real response");
      }
      console.log("🎯 img2real task submitted, ID:", taskId);
      console.log("📊 Queue info - Length:", res.data.data.queue_len, "Rank:", res.data.data.rank);
      const result = await this.poll(taskId, "aitools", "demo-anime2real");
      console.log("✅ img2real completed successfully");
      return result;
    } catch (e) {
      console.error("❌ img2real failed:", e.response?.data || e.message);
      throw e;
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
  const api = new AniFun();
  try {
    let response;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
        break;
      case "txt2manga":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2manga'."
          });
        }
        response = await api.txt2manga(params);
        break;
      case "img2real":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2real'."
          });
        }
        response = await api.img2real(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'txt2img', 'img2img', 'txt2manga', 'img2real'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}