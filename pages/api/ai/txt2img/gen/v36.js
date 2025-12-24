import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class QwenImageAI {
  constructor(options = {}) {
    this.enableLogging = options.log ?? true;
    this.api = axios.create({
      baseURL: "https://qwenimageai.pro/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://qwenimageai.pro",
        priority: "u=1, i",
        referer: "https://qwenimageai.pro/",
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
    this.aspectRatios = {
      SQUARE: "1:1",
      LANDSCAPE: "16:9",
      PORTRAIT: "9:16",
      STANDARD: "4:3",
      VERTICAL: "3:4"
    };
  }
  log(message) {
    this.enableLogging ? console.log(`[QwenImageAI LOG] ${message}`) : null;
  }
  async generateImage({
    prompt,
    aspectRatio = "9:16",
    ...otherParams
  }) {
    this.log(`Membuat gambar dengan prompt: "${prompt}" dan aspect ratio: ${aspectRatio}`);
    try {
      const validRatios = Object.values(this.aspectRatios);
      if (!validRatios.includes(aspectRatio)) {
        throw new Error(`Aspect ratio tidak valid. Gunakan salah satu dari: ${validRatios.join(", ")}`);
      }
      const payload = {
        prompt: prompt,
        aspectRatio: aspectRatio,
        ...otherParams
      };
      this.log(`Mengirim permintaan ke API...`);
      const response = await this.api.post("/generate-image", payload);
      this.log(`Gambar berhasil dibuat`);
      return response.data;
    } catch (error) {
      console.error("Error saat membuat gambar:", error.response?.data || error.message);
      throw error;
    }
  }
  getAvailableAspectRatios() {
    return this.aspectRatios;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const ai = new QwenImageAI();
  try {
    const data = await ai.generateImage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}