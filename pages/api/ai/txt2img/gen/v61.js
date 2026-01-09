import axios from "axios";
class ImageAI {
  constructor() {
    this.headers = {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "i",
      referer: "https://mehub.in/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "image",
      "sec-fetch-mode": "no-cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: "https://imageai.gpt-api.workers.dev",
      headers: this.headers
    });
    this.models = ["@cf/stabilityai/stable-diffusion-xl-base-1.0", "@cf/bytedance/stable-diffusion-xl-lightning", "@cf/lykon/dreamshaper-8-lcm"];
  }
  async generate({
    prompt,
    model,
    ...rest
  }) {
    console.log(`[LOG] Memulai proses generate...`);
    try {
      const cleanPrompt = prompt?.trim() || "scenery, cinematic lighting, 8k";
      const selectedModel = this.models.includes(model) ? model : this.models[0];
      console.log(`[LOG] Model: ${selectedModel}`);
      console.log(`[LOG] Prompt: ${cleanPrompt}`);
      const response = await this.client.get("/generate", {
        params: {
          prompt: cleanPrompt,
          model: selectedModel,
          ...rest
        },
        responseType: "arraybuffer"
      });
      if (response?.status !== 200) {
        throw new Error(`API Error: ${response?.statusText}`);
      }
      const contentType = response?.headers?.["content-type"] || "image/png";
      const buffer = Buffer.from(response.data);
      console.log(`[LOG] Berhasil generate! Ukuran: ${buffer.length} bytes`);
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (error) {
      console.error("[ERROR] Gagal generate:", error?.message || error);
      return {
        buffer: null,
        contentType: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ImageAI();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}