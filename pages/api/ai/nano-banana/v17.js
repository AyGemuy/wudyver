import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import PROMPT from "@/configs/ai-prompt";
import SpoofHead from "@/lib/spoof-head";
class NanoBananaGen {
  constructor() {
    const jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: jar,
      baseURL: "https://nanobananaai.me/api",
      headers: {
        accept: "application/json, text/plain, */*",
        origin: "https://nanobananaai.me",
        referer: "https://nanobananaai.me/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
    this.csrfToken = null;
    console.log("Kelas NanoBananaGen telah diinisialisasi.");
  }
  async initialize() {
    try {
      console.log("Menginisialisasi sesi dan mengambil CSRF token...");
      const response = await this.api.get("/auth/csrf");
      this.csrfToken = response.data.csrfToken || "csrf";
      if (this.csrfToken) {
        console.log("Inisialisasi berhasil, CSRF token diterima.");
      } else {
        throw new Error("Gagal mendapatkan CSRF token.");
      }
    } catch (error) {
      console.error("--- Terjadi error saat inisialisasi ---");
      console.error("Detail error:", error?.response?.data || error?.message || error);
      throw error;
    }
  }
  async _hImg(source) {
    if (Buffer.isBuffer(source)) return source;
    if (typeof source === "string") {
      if (source.startsWith("http")) {
        const response = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      if (source.startsWith("data:image")) {
        return Buffer.from(source.split(",")[1], "base64");
      }
    }
    throw new Error("Format imageUrl tidak didukung. Gunakan URL, Base64, atau Buffer.");
  }
  async _uploadImages(images) {
    console.log("Memulai proses unggah gambar...");
    const imageSources = Array.isArray(images) ? images : [images];
    const form = new FormData();
    for (const [index, imgSrc] of imageSources.entries()) {
      const buffer = await this._hImg(imgSrc);
      form.append("files", buffer, {
        filename: `image_${index}.png`
      });
    }
    const response = await this.api.post("/files/upload", form, {
      headers: {
        ...form.getHeaders()
      }
    });
    console.log("Unggah gambar berhasil.");
    return response.data.data.urls;
  }
  async _pollTask(requestId, model, prompt) {
    console.log(`Memulai polling untuk request ID: ${requestId}`);
    const pollInterval = 3e3;
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const encodedModel = encodeURIComponent(model);
        const response = await this.api.get(`/images/status?id=${requestId}&model=${encodedModel}`);
        const {
          status,
          progress,
          images
        } = response.data;
        console.log(`Status polling: ${status}, Progress: ${progress || 0}%`);
        if (status === "succeeded") {
          console.log("Tugas berhasil diselesaikan.");
          return {
            status: status,
            result: images,
            prompt: prompt
          };
        } else if (status === "failed" || status === "error") {
          console.error("Tugas gagal diproses.");
          return {
            status: status,
            result: [],
            prompt: prompt
          };
        }
      } catch (error) {
        console.error("Error saat polling:", error?.response?.data || error?.message || error);
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    console.error("Polling timeout, tugas tidak selesai dalam waktu yang ditentukan.");
    return {
      status: "Timeout",
      result: [],
      prompt: prompt
    };
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl
  }) {
    await this.initialize();
    if (!this.csrfToken) {
      console.error("Sesi belum diinisialisasi. Jalankan metode initialize() terlebih dahulu.");
      return null;
    }
    console.log("--- Memulai proses pembuatan gambar ---");
    try {
      let referenceImages = [];
      const type = imageUrl ? "image-to-image" : "text-to-image";
      const model = imageUrl ? "fal-ai/nano-banana/edit" : "fal-ai/nano-banana";
      if (imageUrl) {
        referenceImages = await this._uploadImages(imageUrl);
      }
      const payload = {
        prompt: prompt,
        type: type,
        referenceImages: referenceImages
      };
      console.log(`Mengirim permintaan generate dengan tipe: ${type}`);
      const genResponse = await this.api.post("/images/generate", payload, {
        headers: {
          "content-type": "application/json"
        }
      });
      const requestId = genResponse.data.data.requestId;
      if (!requestId) {
        throw new Error("Gagal mendapatkan request ID dari API.");
      }
      return await this._pollTask(requestId, model, prompt);
    } catch (error) {
      console.error("--- Terjadi error saat proses pembuatan ---");
      console.error("Detail error:", error?.response?.data || error?.message || error);
      return null;
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
  const api = new NanoBananaGen();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}