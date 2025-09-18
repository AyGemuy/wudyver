import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class AIBanana {
  constructor() {
    this.baseURL = "https://aibanana.net";
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      cookie: "__client_uat=0; __client_uat_cihTv-ur=0",
      origin: "https.com//aibanana.net",
      priority: "u=1, i",
      referer: "https://aibanana.net/create",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.client = axios.create({
      baseURL: this.baseURL
    });
    this.validModels = ["qwen-editor", "nano-banana", "flux-konext", "qwen-image"];
    this.validRatios = {
      "nano-banana": ["1:1"],
      default: ["1:1", "4:3", "3:4", "16:9", "9:16"]
    };
  }
  validate(model, aspectRatio) {
    if (!this.validModels.includes(model)) {
      throw new Error(`Model tidak valid: ${model}. Model yang tersedia: ${this.validModels.join(", ")}`);
    }
    const allowedRatios = this.validRatios[model] || this.validRatios["default"];
    if (!allowedRatios.includes(aspectRatio)) {
      throw new Error(`Aspect ratio tidak valid: ${aspectRatio} untuk model ${model}. Ratio yang tersedia: ${allowedRatios.join(", ")}`);
    }
  }
  async generate({
    prompt,
    imageUrl,
    model = "nano-banana",
    aspectRatio = "1:1",
    numImages = 1
  }) {
    try {
      this.validate(model, aspectRatio);
      if (imageUrl) {
        console.log("Memulai mode Image-to-Image...");
        const form = new FormData();
        form.append("prompt", prompt);
        form.append("model", model);
        form.append("mode", "image-to-image");
        form.append("numImages", numImages.toString());
        form.append("aspectRatio", aspectRatio);
        form.append("multipleImages", "true");
        form.append("imageCount", "1");
        let imageData, filename = "image.jpg";
        if (imageUrl.startsWith("http")) {
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageData = Buffer.from(response.data);
          try {
            const url = new URL(imageUrl);
            const pathname = url.pathname;
            filename = pathname.substring(pathname.lastIndexOf("/") + 1) || filename;
          } catch (e) {}
        } else if (Buffer.isBuffer(imageUrl)) {
          imageData = imageUrl;
        } else {
          imageData = Buffer.from(imageUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
        }
        form.append("image_0", imageData, {
          filename: filename
        });
        const response = await this.client.post("/api/image-generation", form, {
          headers: {
            ...this.baseHeaders,
            ...form.getHeaders()
          }
        });
        return response.data;
      } else {
        console.log("Memulai mode Text-to-Image...");
        const payload = {
          prompt: prompt,
          model: model,
          mode: "text-to-image",
          numImages: numImages,
          aspectRatio: aspectRatio
        };
        const response = await this.client.post("/api/image-generation", payload, {
          headers: {
            ...this.baseHeaders,
            "content-type": "application/json"
          }
        });
        return response.data;
      }
    } catch (error) {
      if (error.response) {
        console.error("Gagal menghasilkan gambar:", error.response.data);
        throw new Error(JSON.stringify(error.response.data));
      } else {
        console.error("Gagal menghasilkan gambar:", error.message);
        throw new Error(error.message || "Gagal terhubung ke AIBanana API");
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan."
    });
  }
  try {
    const ai = new AIBanana();
    const response = await ai.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}