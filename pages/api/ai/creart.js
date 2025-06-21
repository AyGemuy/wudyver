import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import crypto from "crypto";
import qs from "qs";
import apiConfig from "@/configs/apiConfig";
class CreartAI {
  constructor() {
    this.apiUrl = "https://api.creartai.com/api/v1/text2image";
    this.translateUrl = "https://ssl-api.itranslateapp.com/v3/texts/translate";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload?host=Catbox`;
    this.allowedStyles = ["anime", "animev2", "animev3", "animev4", "artdeco", "bwcomic", "chromatic", "cinematic", "classiccartoon", "clay", "colorcomic", "coloredsketch", "colorfulsketch", "coloringbook", "creartv1", "cubism", "cyberpunk", "cyberpunkcartoon", "darksurrealism", "dream", "expressionism", "fantasy", "filmnoir", "fluidwatercolor", "game", "gothicfuturism", "grisaille", "illustration", "impressionism", "jewelry", "kawaii", "kidscartoon", "lowpoly", "macrophoto", "mystical", "naiveart", "neon", "nostyle", "origami", "papercut", "pixelart", "pixelarthd", "popart", "popsurrealism", "porcelainfigurine", "poster", "productphoto", "psychedelic", "realistic", "renaissance", "retrofuturism", "sketch", "stainedglass", "sticker", "surrealism", "synthwave", "textile", "ukiyoe", "vangogh", "vectorart", "vividcolors", "watercolor", "woodsculpture", "wool", "neonpunk", "cartoon"];
    this.baseUrl = "https://api.creartai.com";
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.randomID(8),
      ...extra
    };
  }
  async _getImageBase64FromUrl(url) {
    console.log(`[PROSES] Mengambil gambar dari URL: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      console.log(`[INFO] Berhasil mengambil gambar dari URL.`);
      return Buffer.from(response.data).toString("base64");
    } catch (error) {
      console.error(`[ERROR] Gagal mengambil gambar dari URL (${url}): ${error?.message}`);
      throw new Error(`Gagal mengambil gambar dari URL: ${error?.message}`);
    }
  }
  async _generateImageInternal(prompt, style, options = {}) {
    if (!this.allowedStyles.includes(style)) {
      const errorMessage = `Gaya tidak valid. Gaya yang diizinkan: ${this.allowedStyles.join(", ")}`;
      console.error(`[ERROR] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    console.log(`[PROSES] Menerjemahkan prompt: "${prompt}"`);
    let translatedPrompt;
    try {
      const translationResult = await this.translate({
        text: prompt,
        from: "id",
        to: "en-UK"
      });
      translatedPrompt = translationResult?.target?.text ?? prompt;
      console.log(`[INFO] Prompt diterjemahkan menjadi: "${translatedPrompt}"`);
    } catch (error) {
      console.warn(`[PERINGATAN] Gagal menerjemahkan prompt, menggunakan prompt asli. Error: ${error?.message}`);
      translatedPrompt = prompt;
    }
    console.log(`[PROSES] Menyiapkan data untuk ${options?.input_image_type ?? "text2image"} dengan gaya: ${style}`);
    try {
      let data = qs.stringify({
        prompt: `${translatedPrompt}, ${style}, cinematic`,
        input_image_type: options?.input_image_type ?? "text2image",
        input_image_base64: options?.input_image_base64 ?? "",
        negative_prompt: options?.negative_prompt ?? "",
        aspect_ratio: options?.aspect_ratio ?? "16x9",
        num_inference_steps: options?.num_inference_steps ?? "",
        controlnet_conditioning_scale: options?.controlnet_conditioning_scale ?? "0.5",
        guidance_scale: options?.guidance_scale ?? "9.5",
        scheduler: options?.scheduler ?? "",
        seed: options?.seed ?? ""
      });
      const headers = this.buildHeaders({
        "Content-Type": "application/x-www-form-urlencoded"
      });
      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: this.apiUrl,
        headers: headers,
        data: data
      };
      console.log(`[PROSES] Mengirim permintaan ke API CreartAI...`);
      const response = await axios.request(config);
      console.log(`[INFO] Permintaan pembuatan gambar berhasil.`);
      const imageBase64 = response.data?.image_base64;
      if (!imageBase64) {
        throw new Error("API CreartAI tidak mengembalikan data image_base64.");
      }
      console.log(`[PROSES] Mengunggah gambar yang dihasilkan ke Supa.codes...`);
      const uploadResult = await this.uploadImage(imageBase64);
      console.log(`[INFO] Gambar berhasil diunggah.`);
      return uploadResult;
    } catch (error) {
      console.error("[ERROR] Error saat menghasilkan atau mengunggah gambar:", error?.message);
      throw new Error(`Pembuatan dan/atau pengunggahan gambar gagal: ${error?.message}`);
    }
  }
  async translate({
    text = "cowo",
    from = "id",
    to = "en-UK",
    ...rest
  }) {
    console.log(`[PROSES] Memulai terjemahan teks: "${text}" dari ${from} ke ${to}`);
    try {
      let data = JSON.stringify({
        source: {
          dialect: from,
          text: text
        },
        target: {
          dialect: to
        }
      });
      const headers = this.buildHeaders({
        "API-Key": "dd71d7f0a905ecc757dae71156c8d2de",
        GUDID: "ab55e939-ddbf-4200-8bd5-bc0db1074260",
        "X-Correlation-ID": "ab55e939-ddbf-4200-8bd5-bc0db1074260",
        Premium: "1",
        Secure: "1",
        "Input-Source": "0",
        "Content-Type": "application/json",
        ...rest
      });
      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: this.translateUrl,
        headers: headers,
        data: data
      };
      const response = await axios.request(config);
      console.log(`[INFO] Terjemahan berhasil.`);
      return response.data;
    } catch (error) {
      console.error("[ERROR] Error saat menerjemahkan teks:", error?.message);
      throw new Error(`Terjemahan gagal: ${error?.message}`);
    }
  }
  async txt2img({
    prompt = "",
    style = "realistic",
    aspect_ratio = "16x9",
    num_inference_steps = "",
    controlnet_conditioning_scale = "0.5",
    guidance_scale = "9.5",
    scheduler = "",
    negative_prompt = "",
    seed = ""
  }) {
    console.log(`\n[PROSES] Memulai permintaan Text-to-Image.`);
    if (!prompt || !style) {
      const errorMessage = "Prompt dan gaya wajib diisi untuk text-to-image.";
      console.error(`[ERROR] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    return await this._generateImageInternal(prompt, style, {
      input_image_type: "text2image",
      aspect_ratio: aspect_ratio,
      num_inference_steps: num_inference_steps,
      controlnet_conditioning_scale: controlnet_conditioning_scale,
      guidance_scale: guidance_scale,
      scheduler: scheduler,
      negative_prompt: negative_prompt,
      seed: seed
    });
  }
  async img2img({
    imageUrl = "",
    prompt = "",
    style = "realistic",
    aspect_ratio = "16x9",
    num_inference_steps = "",
    controlnet_conditioning_scale = "0.5",
    guidance_scale = "9.5",
    scheduler = "",
    negative_prompt = "",
    seed = ""
  }) {
    console.log(`\n[PROSES] Memulai permintaan Image-to-Image.`);
    if (!imageUrl || !prompt || !style) {
      const errorMessage = "imageUrl, prompt, dan gaya wajib diisi untuk image-to-image.";
      console.error(`[ERROR] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    let imageBase64 = imageUrl;
    if (imageUrl.startsWith("http")) {
      try {
        imageBase64 = await this._getImageBase64FromUrl(imageUrl);
      } catch (error) {
        console.error(`[ERROR] Gagal menyiapkan gambar masukan dari URL untuk img2img: ${error?.message}`);
        throw new Error(`Gagal menyiapkan gambar masukan untuk img2img: ${error?.message}`);
      }
    }
    return await this._generateImageInternal(prompt, style, {
      input_image_type: "image2image",
      input_image_base64: imageBase64,
      aspect_ratio: aspect_ratio,
      num_inference_steps: num_inference_steps,
      controlnet_conditioning_scale: controlnet_conditioning_scale,
      guidance_scale: guidance_scale,
      scheduler: scheduler,
      negative_prompt: negative_prompt,
      seed: seed
    });
  }
  async uploadImage(dataUri, mimeType = "image/png") {
    try {
      const requestData = {
        file: dataUri
      };
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, requestData);
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  const allowedActions = ["txt2img", "img2img", "translate"];
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: allowedActions.join(" | ")
      }
    });
  }
  if (!allowedActions.includes(action)) {
    return res.status(400).json({
      error: `Invalid action: '${action}'. Allowed actions are: ${allowedActions.join(", ")}`
    });
  }
  try {
    let result;
    const creartAI = new CreartAI();
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields: prompt (for action: ${action})`
          });
        }
        result = await creartAI.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required fields: imageUrl (for action: ${action})`
          });
        }
        result = await creartAI.img2img(params);
        break;
      case "translate":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (for action: ${action})`
          });
        }
        result = await creartAI.translate(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: '${action}'. Allowed actions are: ${allowedActions.join(", ")}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Error processing CreartAI action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: `Processing error for action '${action}': ${error?.message || "Unknown error"}`
    });
  }
}