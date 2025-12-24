import axios from "axios";
import FormData from "form-data";
const toBuffer = async image => {
  if (Buffer.isBuffer(image)) return image;
  if (typeof image === "string") {
    if (image.startsWith("http")) {
      const response = await axios.get(image, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    }
    return Buffer.from(image, "base64");
  }
  throw new Error("Tipe input gambar tidak valid. Gunakan URL, Base64, atau Buffer.");
};
class KellyAPI {
  constructor() {
    this.baseUrls = ["https://kellyapi.koyeb.app", "https://kelly.ps.ai"];
    this.api = null;
    this.apiKey = null;
    this.config = {
      models: {
        endpoint: "/chat/models",
        method: "GET"
      },
      chat: {
        endpoint: "/chat/completions",
        method: "POST",
        requestType: "json",
        dataBuilder: p => ({
          model: p.model || "meta-llama/llama-3.1-8b-instruct:free",
          messages: p.messages || [{
            role: "user",
            content: "Hello"
          }],
          max_tokens: p.max_tokens ?? 1024,
          temperature: p.temperature ?? .7
        })
      },
      generate: {
        endpoint: "/image/generate",
        method: "POST",
        requestType: "json",
        dataBuilder: p => ({
          prompt: p.prompt,
          negative_prompt: p.negative_prompt || "canvas frame, cartoon, 3d, ((disfigured)), ((bad art)), ((deformed)),((extra limbs)),((close up)),((b&w)), weird colors, blurry, (((duplicate))), ((morbid)), ((mutilated)), [out of frame], extra fingers, mutated hands, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), ((ugly)), blurry, ((bad anatomy)), (((bad proportions))), ((extra limbs)), cloned face, (((disfigured))), out of frame, ugly, extra limbs, (bad anatomy), gross proportions, (malformed limbs), ((missing arms)), ((missing legs)), (((extra arms))), (((extra legs))), mutated hands, (fused fingers), (too many fingers), (((long neck))), Photoshop, video game, ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, mutation, mutated, extra limbs, extra legs, extra arms, disfigured, deformed, cross-eye, body out of frame, blurry, bad art, bad anatomy, nsfw",
          mode: p.mode || "Quality",
          width: p.width ?? 1024,
          height: p.height ?? 1024,
          batch_size: p.batch_size ?? 1,
          style: p.style || ""
        })
      },
      description: {
        endpoint: "/image/description",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file,
          prompt: p.prompt || "describe this image"
        })
      },
      removebg: {
        endpoint: "/image/removebg",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file
        })
      },
      upscale: {
        endpoint: "/image/upscale",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file
        })
      },
      headshot: {
        endpoint: "/image/headshot",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file,
          style: p.style || "Professional",
          style_id: p.style_id
        })
      },
      filter: {
        endpoint: "/image/filter",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file,
          style: p.style || "Ghibli",
          style_id: p.style_id
        })
      },
      clotheschange: {
        endpoint: "/image/clotheschange",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file,
          style: p.style || "Partywear",
          style_id: p.style_id
        })
      },
      imgchat: {
        endpoint: "/image/chatgpt",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file,
          prompt: p.prompt || "ghiblify me",
          aspect_ratio: p.aspect_ratio || "2:3"
        })
      },
      colorizer: {
        endpoint: "/image/colorizer",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file
        })
      },
      faceswap: {
        endpoint: "/image/faceswap",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          source_image: p.source,
          face_image: p.face
        })
      },
      hairstyle: {
        endpoint: "/image/hairstyle",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file,
          prompt: p.prompt || "cyan, long hair"
        })
      },
      animeart: {
        endpoint: "/image/animeart",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file
        })
      },
      aibaby: {
        endpoint: "/image/aibaby",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          father_image: p.father,
          mother_image: p.mother,
          baby_gender: p.gender || "boy"
        })
      },
      "remove-watermark": {
        endpoint: "/image/remove-watermark",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file,
          type: p.type || "logo"
        })
      },
      sketch: {
        endpoint: "/image/sketch",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file
        })
      },
      enhance: {
        endpoint: "/image/enhance",
        method: "POST",
        requestType: "form",
        dataBuilder: p => ({
          file: p.file
        })
      },
      notes: {
        endpoint: "/write/notes",
        method: "POST",
        requestType: "json",
        dataBuilder: p => ({
          text: p.text || "Hello World"
        })
      },
      code: {
        endpoint: "/write/code",
        method: "POST",
        requestType: "json",
        dataBuilder: p => ({
          code: p.code || "Hello World"
        })
      }
    };
  }
  async init() {
    if (this.api) return this;
    console.log("[Log] Memulai inisialisasi...");
    if (!this.apiKey) {
      try {
        const apiKeyUrl = "https://apikey-api.vercel.app/apiKey";
        const response = await axios.get(apiKeyUrl);
        const keysData = response?.data?.data;
        if (!keysData || keysData.length === 0) throw new Error("Tidak ada API key yang diterima.");
        this.apiKey = keysData[6]?.apiKey;
        if (!this.apiKey) throw new Error("Gagal mengekstrak API key.");
        console.log("[Log] API key berhasil didapatkan.");
      } catch (error) {
        console.error("[Log] Gagal mendapatkan API key:", error.message);
        throw error;
      }
    }
    for (const baseUrl of this.baseUrls) {
      console.log(`[Log] Mencoba terhubung ke: ${baseUrl}`);
      try {
        const tempApi = axios.create({
          baseURL: baseUrl,
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          },
          timeout: 15e3
        });
        await tempApi.get(this.config.models.endpoint);
        console.log(`[Log] Koneksi ke ${baseUrl} berhasil.`);
        this.api = tempApi;
        break;
      } catch (error) {
        console.warn(`[Log] Gagal terhubung ke ${baseUrl}. Mencoba URL berikutnya...`);
      }
    }
    if (!this.api) {
      throw new Error("Inisialisasi gagal. Tidak dapat terhubung ke semua server API yang tersedia.");
    }
    console.log(`[Log] Inisialisasi berhasil. Klien siap digunakan dengan URL: ${this.api.defaults.baseURL}`);
    return this;
  }
  async request(actionConfig, payload) {
    const {
      endpoint,
      method,
      requestType
    } = actionConfig;
    console.log(`[Log] Proses dimulai: ${method} ${endpoint} via ${this.api.defaults.baseURL}`);
    try {
      let response;
      if (method === "GET") {
        response = await this.api.get(endpoint);
      } else if (requestType === "json") {
        response = await this.api.post(endpoint, payload);
      } else if (requestType === "form") {
        const form = new FormData();
        const imageKeys = ["file", "source_image", "face_image", "father_image", "mother_image"];
        for (const key in payload) {
          const value = payload[key];
          if (imageKeys.includes(key) && value) {
            const buffer = await toBuffer(value);
            form.append(key, buffer, {
              filename: `${key}.png`
            });
          } else if (value !== undefined && value !== null) {
            form.append(key, value);
          }
        }
        response = await this.api.post(endpoint, form, {
          headers: form.getHeaders()
        });
      }
      console.log(`[Log] Proses berhasil: ${endpoint}`);
      return response.data;
    } catch (error) {
      console.error(`[Log] Error pada ${endpoint}:`, error?.response?.data || error.message);
      return error?.response?.data || {
        code: "NETWORK_ERROR",
        message: error.message
      };
    }
  }
  async run({
    action,
    ...rest
  }) {
    console.log(`[Log] Aksi diminta: ${action || "Tidak ada"}`);
    try {
      await this.init();
    } catch (initError) {
      return {
        status: "error",
        message: initError.message,
        data: null,
        details: null
      };
    }
    const actionConfig = this.config[action];
    if (!actionConfig) {
      const availableActions = Object.keys(this.config);
      const errorMessage = `Aksi '${action || ""}' tidak valid atau kosong.`;
      console.error(`[Error] ${errorMessage}`);
      return {
        status: "error",
        message: errorMessage,
        data: null,
        details: {
          available_actions: availableActions
        }
      };
    }
    const payload = actionConfig.dataBuilder ? actionConfig.dataBuilder(rest) : {};
    return await this.request(actionConfig, payload);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const ai = new KellyAPI();
    const response = await ai.run(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}