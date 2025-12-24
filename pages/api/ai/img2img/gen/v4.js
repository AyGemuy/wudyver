import axios from "axios";
import PROMPT from "@/configs/ai-prompt";
import ApiKey from "@/configs/api-key";
class NanoBananaAI {
  constructor() {
    this.listKey = ApiKey.fal;
    this.baseURL = "https://queue.fal.run/fal-ai/gemini-25-flash-image";
    this.enableLogging = true;
  }
  log(message) {
    if (this.enableLogging) {
      console.log(`[NanoBananaAI LOG] ${message}`);
    }
  }
  async generate({
    imageUrl,
    prompt = PROMPT.text,
    numImages = 1,
    outputFormat = "jpeg"
  }) {
    if (!imageUrl || Array.isArray(imageUrl) && imageUrl.length === 0) {
      throw new Error("imageUrl (URL, Base64, atau Buffer) diperlukan");
    }
    let lastError;
    const urlsToProcess = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
    const processedImageUrls = urlsToProcess.map((img, index) => {
      if (typeof img === "string") return img;
      if (Buffer.isBuffer(img)) return `data:image/jpeg;base64,${img.toString("base64")}`;
      throw new Error(`Format imageUrl #${index + 1} tidak didukung.`);
    });
    for (const key of this.listKey) {
      try {
        this.log(`Mencoba menggunakan key: ${key.substring(0, 8)}...`);
        const createResponse = await axios.post(`${this.baseURL}/edit`, {
          prompt: prompt,
          num_images: numImages,
          output_format: outputFormat,
          image_urls: processedImageUrls
        }, {
          headers: {
            Authorization: `Key ${key}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "@fal-ai/client/1.6.2"
          }
        });
        const {
          status_url: statusUrl,
          response_url: responseUrl
        } = createResponse.data;
        if (!statusUrl || !responseUrl) throw new Error("Gagal mendapatkan URL status/response.");
        let status = "WAIT";
        const maxAttempts = 30;
        let finalData = null;
        for (let attempts = 1; attempts <= maxAttempts; attempts++) {
          const statusResponse = await axios.get(statusUrl, {
            headers: {
              Authorization: `Key ${key}`,
              "User-Agent": "@fal-ai/client/1.6.2"
            }
          });
          status = statusResponse.data.status;
          this.log(`Status [${key.substring(0, 5)}]: ${status} (${attempts}/${maxAttempts})`);
          if (status === "COMPLETED") {
            const resultResponse = await axios.get(responseUrl, {
              headers: {
                Authorization: `Key ${key}`,
                "User-Agent": "@fal-ai/client/1.6.2"
              }
            });
            finalData = resultResponse.data.images;
            break;
          }
          if (status === "FAILED") throw new Error("Proses di server Fal.ai gagal.");
          await new Promise(resolve => setTimeout(resolve, 3e3));
        }
        if (finalData) {
          this.log("Berhasil mendapatkan hasil.");
          return finalData;
        }
      } catch (error) {
        lastError = error;
        const msg = error.response?.data?.detail || error.message;
        console.error(`[Key Failed] ${key.substring(0, 8)}: ${msg}`);
        continue;
      }
    }
    throw new Error(`Semua API Key gagal. Terakhir: ${lastError?.message}`);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'imageUrl' wajib diisi (bisa URL, Base64, atau Buffer)"
    });
  }
  const api = new NanoBananaAI();
  try {
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[API ERROR]:`, error.message);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server"
    });
  }
}