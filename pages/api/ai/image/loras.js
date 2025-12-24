import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
class ImageUploader {
  constructor(options = {}) {
    console.log("Proses: Inisialisasi ImageUploader");
    this.api = axios.create({
      baseURL: options.baseURL || `https://${apiConfig.DOMAIN_URL}/api/tools`
    });
  }
  async upload(lorasResponseData) {
    console.log("Proses: Memulai upload gambar...");
    const base64String = lorasResponseData?.image?.b64_json;
    if (!base64String) {
      console.error("Proses: Gagal! Data gambar base64 tidak ditemukan dalam respons.");
      return {
        success: false,
        error: "Data base64 tidak ditemukan.",
        statusCode: 400
      };
    }
    try {
      const imageBuffer = Buffer.from(base64String, "base64");
      console.log(`Proses: Konversi base64 ke Buffer berhasil (ukuran: ${imageBuffer.length} bytes).`);
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: "generated-image.jpeg",
        contentType: "image/jpeg"
      });
      console.log("Proses: Mengirim form-data ke API upload...");
      const response = await this.api.post("/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Upload berhasil!");
      return response.data;
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat mengunggah gambar!");
      const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan yang tidak diketahui";
      const statusCode = error.response?.status || 500;
      console.error(`Detail Error: Status ${statusCode} - ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        statusCode: statusCode
      };
    }
  }
}
const LORA_MODELS = [{
  id: 9,
  name: "Icons",
  model: "Flux-Icon-Kit-LoRA",
  scale: 1,
  steps: 33,
  height: 832,
  width: 1280
}, {
  id: 6,
  name: "Logos",
  model: "FLUX.1-dev-LoRA-Logo-Design",
  scale: .8,
  steps: 28
}, {
  id: 7,
  name: "Midjourney",
  model: "Flux-Midjourney-Mix2-LoRA",
  scale: 1,
  steps: 28
}, {
  id: 10,
  name: "Tarot Card",
  model: "flux-tarot-v1",
  scale: 1,
  steps: 28
}, {
  id: 3,
  name: "Vector Sketch",
  model: "vector-illustration",
  scale: 1,
  steps: 28
}, {
  id: 1,
  name: "Colored Sketch",
  model: "Flux-Sketch-Ep-LoRA",
  scale: 1,
  steps: 33,
  height: 832,
  width: 1280
}, {
  id: 4,
  name: "Pencil Sketch",
  model: "shou_xin",
  scale: 1,
  steps: 28
}, {
  id: 5,
  name: "Anime Sketch",
  model: "anime-blockprint-style",
  scale: 1,
  steps: 28
}];
const LORAS_DEFAULT_HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  "content-type": "application/json",
  origin: "https://www.loras.dev",
  priority: "u=1, i",
  referer: "https://www.loras.dev/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  ...SpoofHead()
};
class AxiosLoras {
  constructor(options = {}) {
    console.log("Proses: Inisialisasi AxiosLoras");
    this.api = axios.create({
      baseURL: options.baseURL || "https://www.loras.dev/api",
      headers: LORAS_DEFAULT_HEADERS
    });
    this.models = LORA_MODELS;
  }
  findLoraByName(name) {
    console.log(`Proses: Mencari LoRA dengan nama "${name}"...`);
    return this.models.find(m => m.name.toLowerCase() === name.toLowerCase());
  }
  async generate({
    prompt,
    lora,
    seed,
    ...rest
  }) {
    if (!prompt || !lora) {
      console.error("Proses: Gagal! `prompt` dan `lora` wajib diisi.");
      return {
        success: false,
        error: "Input tidak valid. `prompt` dan `lora` wajib diisi.",
        statusCode: 400
      };
    }
    const loraDetails = this.findLoraByName(lora);
    if (!loraDetails) {
      console.error(`Proses: Gagal! LoRA dengan nama "${lora}" tidak ditemukan.`);
      const availableLoras = this.models.map(m => m.name).join(", ");
      return {
        success: false,
        error: `LoRA "${lora}" tidak ditemukan. Pilihan yang tersedia: ${availableLoras}`,
        statusCode: 404
      };
    }
    console.log(`Proses: LoRA ditemukan. Model yang digunakan: "${loraDetails.model}"`);
    try {
      const payload = {
        prompt: prompt,
        lora: loraDetails.model,
        userAPIKey: rest.userAPIKey || "",
        seed: seed ? seed : Math.floor(Math.random() * 1e7) + 1,
        steps: rest.steps || loraDetails.steps,
        scale: rest.scale || loraDetails.scale,
        width: rest.width || loraDetails.width,
        height: rest.height || loraDetails.height
      };
      if (payload.width === undefined) delete payload.width;
      if (payload.height === undefined) delete payload.height;
      console.log("Proses: Mengirim data payload ke API:", payload);
      const response = await this.api.post("/image", payload);
      console.log("Proses: Permintaan berhasil, respons diterima.");
      const uploader = new ImageUploader();
      return await uploader.upload(response.data);
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat permintaan API!");
      const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan yang tidak diketahui";
      const statusCode = error.response?.status || 500;
      console.error(`Detail Error: Status ${statusCode} - ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        statusCode: statusCode
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const ai = new AxiosLoras();
    const response = await ai.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}