import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class NanoBananaAI {
  constructor(options = {}) {
    this.enableLogging = options.log ?? true;
    this.baseURL = "https://www.nanobananaai.dev/api";
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.nanobananaai.dev",
        priority: "u=1, i",
        referer: "https://www.nanobananaai.dev/home",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.cookies = {};
    this.updateCookieHeader();
  }
  log(message) {
    this.enableLogging ? console.log(`[NanoBananaAI LOG] ${message}`) : null;
  }
  updateCookieHeader() {
    const cookieString = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
    this.api.defaults.headers.common["cookie"] = cookieString;
  }
  async _handleImageUrl(imageUrl) {
    this.log(`Memproses input gambar: ${imageUrl}`);
    if (imageUrl.startsWith("data:image/")) {
      this.log("Input adalah string Base64.");
      return imageUrl;
    }
    if (imageUrl.startsWith("http")) {
      this.log(`Input adalah URL. Mengunduh dari: ${imageUrl}`);
      try {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
          }
        });
        const mimeType = response.headers["content-type"];
        const base64 = Buffer.from(response.data).toString("base64");
        return `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.error("Gagal mengunduh gambar dari URL.", error.message);
        throw new Error(`Tidak dapat memproses gambar dari URL: ${imageUrl}`);
      }
    }
    throw new Error("Format imageUrl tidak valid. Harus berupa URL publik atau Base64 data URI.");
  }
  async _extractBase64Data(imageData) {
    if (imageData.startsWith("data:")) {
      return imageData.split(",")[1];
    }
    return imageData;
  }
  async txt2img({
    prompt,
    size = "720x1440",
    ...rest
  }) {
    if (!prompt) throw new Error("prompt diperlukan untuk Text-to-Image generation");
    this.log(`Membuat task Text-to-Image dengan prompt: "${prompt}"`);
    try {
      const payload = {
        prompt: prompt,
        size: size,
        ...rest
      };
      this.log(`Mengirim permintaan Text-to-Image...`);
      const response = await this.api.post("/generate", payload);
      this.log(`Text-to-Image berhasil dibuat`);
      return response.data;
    } catch (error) {
      console.error("Error membuat task Text-to-Image:", error.response?.data || error.message);
      throw error;
    }
  }
  async img2img({
    prompt = "",
    neg_prompt = "",
    init_image,
    ...rest
  }) {
    if (!init_image) throw new Error("init_image diperlukan untuk Image-to-Image generation");
    this.log(`Membuat task Image-to-Image dengan prompt: "${prompt}", neg_prompt: "${neg_prompt}"`);
    try {
      const processedImage = await this._handleImageUrl(init_image);
      const base64Data = await this._extractBase64Data(processedImage);
      const text_prompts = [];
      if (prompt && prompt.trim() !== "") {
        text_prompts.push({
          text: prompt.trim(),
          weight: 1
        });
      }
      if (neg_prompt && neg_prompt.trim() !== "") {
        text_prompts.push({
          text: neg_prompt.trim(),
          weight: -1
        });
      }
      if (text_prompts.length === 0) {
        text_prompts.push({
          text: "enhance image",
          weight: 1
        });
      }
      const payload = {
        text_prompts: text_prompts,
        init_image: base64Data,
        ...rest
      };
      this.log(`Mengirim permintaan Image-to-Image dengan ${text_prompts.length} prompt...`);
      const response = await this.api.post("/generate-image-to-image", payload);
      this.log(`Image-to-Image berhasil dibuat`);
      return response.data;
    } catch (error) {
      console.error("Error membuat task Image-to-Image:", error.response?.data || error.message);
      throw error;
    }
  }
  createTextPrompt(text, weight = 1) {
    return {
      text: text,
      weight: weight
    };
  }
  createPrompts(positiveText = "", negativeText = "") {
    const prompts = [];
    if (positiveText && positiveText.trim() !== "") {
      prompts.push(this.createTextPrompt(positiveText.trim(), 1));
    }
    if (negativeText && negativeText.trim() !== "") {
      prompts.push(this.createTextPrompt(negativeText.trim(), -1));
    }
    return prompts;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const api = new NanoBananaAI();
  try {
    let response;
    switch (action) {
      case "img2img":
        if (!params.prompt || !params.init_image) {
          return res.status(400).json({
            error: "Prompt and init_image are required for img2img."
          });
        }
        response = await api.img2img(params);
        return res.status(200).json(response);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2img(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2img' and 'txt2img'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}