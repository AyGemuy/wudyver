import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import crypto from "crypto";
import qs from "qs";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class CreartAI {
  constructor({
    version = "v1",
    ...options
  } = {}) {
    this.version = version;
    this.apiUrl = `https://api.creartai.com/api/${version}/text2image`;
    this.translateUrl = "https://ssl-api.itranslateapp.com/v3/texts/translate";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.allowedStyles = ["anime", "animev2", "animev3", "animev4", "artdeco", "bwcomic", "chromatic", "cinematic", "classiccartoon", "clay", "colorcomic", "coloredsketch", "colorfulsketch", "coloringbook", "creartv1", "cubism", "cyberpunk", "cyberpunkcartoon", "darksurrealism", "dream", "expressionism", "fantasy", "filmnoir", "fluidwatercolor", "game", "gothicfuturism", "grisaille", "illustration", "impressionism", "jewelry", "kawaii", "kidscartoon", "lowpoly", "macrophoto", "mystical", "naiveart", "neon", "nostyle", "origami", "papercut", "pixelart", "pixelarthd", "popart", "popsurrealism", "porcelainfigurine", "poster", "productphoto", "psychedelic", "realistic", "renaissance", "retrofuturism", "sketch", "stainedglass", "sticker", "surrealism", "synthwave", "textile", "ukiyoe", "vangogh", "vectorart", "vividcolors", "watercolor", "woodsculpture", "wool", "neonpunk", "cartoon"];
    this.baseUrl = "https://api.creartai.com";
    this.options = options;
  }
  setVersion(version) {
    this.version = version;
    this.apiUrl = `https://api.creartai.com/api/${version}/text2image`;
  }
  id(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  headers(extra = {}) {
    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "x-request-id": this.id(8),
      ...SpoofHead(),
      ...extra
    };
  }
  async getImg(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Gagal mengambil gambar: ${error?.message}`);
    }
  }
  async genImg(prompt, style, {
    input_image_type,
    input_image_base64,
    ...rest
  } = {}) {
    if (!this.allowedStyles.includes(style)) {
      throw new Error(`Gaya tidak valid. Gaya yang diizinkan: ${this.allowedStyles.join(", ")}`);
    }
    let translatedPrompt;
    try {
      const translationResult = await this.trs({
        text: prompt,
        from: "id",
        to: "en-UK"
      });
      translatedPrompt = translationResult?.target?.text ?? prompt;
    } catch (error) {
      translatedPrompt = prompt;
    }
    try {
      let data = qs.stringify({
        prompt: `${translatedPrompt}, ${style}, cinematic`,
        input_image_type: input_image_type ?? "text2image",
        input_image_base64: input_image_base64 ?? "",
        negative_prompt: rest.negative_prompt ?? "",
        aspect_ratio: rest.aspect_ratio ?? "16x9",
        num_inference_steps: rest.num_inference_steps ?? "",
        controlnet_conditioning_scale: rest.controlnet_conditioning_scale ?? "0.5",
        guidance_scale: rest.guidance_scale ?? "9.5",
        scheduler: rest.scheduler ?? "",
        seed: rest.seed ?? "",
        ...rest
      });
      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: this.apiUrl,
        headers: this.headers({
          "Content-Type": "application/x-www-form-urlencoded"
        }),
        data: data
      };
      const response = await axios.request(config);
      if (this.version === "v2") {
        const imageBuffer = Buffer.from(response.data, "binary");
        return await this.upImg(imageBuffer);
      } else {
        const imageBase64 = response.data?.image_base64;
        if (!imageBase64) throw new Error("Tidak ada data gambar yang dikembalikan.");
        return await this.upImg(this.toBuf(imageBase64));
      }
    } catch (error) {
      throw new Error(`Pembuatan gambar gagal: ${error?.message}`);
    }
  }
  async trs({
    text = "",
    from = "id",
    to = "en-UK",
    ...rest
  }) {
    try {
      let data = JSON.stringify({
        source: {
          dialect: from,
          text: text
        },
        target: {
          dialect: to
        },
        ...rest
      });
      const headers = this.headers({
        "API-Key": "dd71d7f0a905ecc757dae71156c8d2de",
        GUDID: "ab55e939-ddbf-4200-8bd5-bc0db1074260",
        "X-Correlation-ID": "ab55e939-ddbf-4200-8bd5-bc0db1074260",
        Premium: "1",
        Secure: "1",
        "Input-Source": "0",
        "Content-Type": "application/json",
        ...rest.headers
      });
      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: this.translateUrl,
        headers: headers,
        data: data
      };
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
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
    seed = "",
    ...rest
  }) {
    if (!prompt || !style) throw new Error("Prompt dan gaya wajib diisi");
    return await this.genImg(prompt, style, {
      input_image_type: "text2image",
      aspect_ratio: aspect_ratio,
      num_inference_steps: num_inference_steps,
      controlnet_conditioning_scale: controlnet_conditioning_scale,
      guidance_scale: guidance_scale,
      scheduler: scheduler,
      negative_prompt: negative_prompt,
      seed: seed,
      ...rest
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
    seed = "",
    ...rest
  }) {
    if (!imageUrl || !prompt || !style) throw new Error("imageUrl, prompt, dan gaya wajib diisi");
    let imageBase64 = imageUrl;
    if (imageUrl.startsWith("http")) {
      try {
        const buffer = await this.getImg(imageUrl);
        imageBase64 = buffer.toString("base64");
      } catch (error) {
        throw new Error(`Gagal menyiapkan gambar: ${error?.message}`);
      }
    }
    return await this.genImg(prompt, style, {
      input_image_type: "image2image",
      input_image_base64: imageBase64,
      aspect_ratio: aspect_ratio,
      num_inference_steps: num_inference_steps,
      controlnet_conditioning_scale: controlnet_conditioning_scale,
      guidance_scale: guidance_scale,
      scheduler: scheduler,
      negative_prompt: negative_prompt,
      seed: seed,
      ...rest
    });
  }
  toBuf(inputString) {
    const base64Data = inputString.startsWith("data:") ? inputString.split(",")[1] : inputString;
    return Buffer.from(base64Data, "base64");
  }
  async upImg(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: formData.headers ? formData.headers : {}
      });
      if (!uploadResponse) throw new Error("Upload gagal");
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error upload: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error("Error upload: " + error.message);
      }
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    version = "v1",
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
    const creartAI = new CreartAI({
      version: version
    });
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields: prompt (for action: ${action})`
          });
        }
        if (!params.style) params.style = "realistic";
        result = await creartAI.txt2img(params);
        break;
      case "img2img":
        if (!params.imageUrl || !params.prompt) {
          return res.status(400).json({
            error: `Missing required fields: imageUrl and prompt (for action: ${action})`
          });
        }
        if (!params.style) params.style = "realistic";
        result = await creartAI.img2img(params);
        break;
      case "translate":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (for action: ${action})`
          });
        }
        result = await creartAI.trs(params);
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