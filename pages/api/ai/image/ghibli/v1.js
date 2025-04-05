import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class ImageProcessor {
  constructor() {
    this.apiUrls = ["https://ghibliai-worker.ahmadjandal.workers.dev/generate", "https://transform-ghibli-style.vercel.app/api/transform-ghibli"];
    this.uploadUrl = "https://i.supa.codes/api/upload";
  }
  async fetchImageAsBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data).toString("base64");
    } catch (error) {
      throw new Error("Gagal mengambil gambar: " + error.message);
    }
  }
  async generate({
    imageUrl,
    host = null
  }) {
    try {
      const base64Image = await this.fetchImageAsBase64(imageUrl);
      const payload = {
        imageUrl: `data:image/jpeg;base64,${base64Image}`
      };
      const apiUrl = host ? this.apiUrls[host - 1] : this.apiUrls[Math.floor(Math.random() * this.apiUrls.length)];
      const {
        data
      } = await axios.post(apiUrl, payload, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 6e4
      });
      if (!data?.result) throw new Error("Gagal memproses gambar, coba gambar lain");
      const base64Data = data.result.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      return await this.uploadImage(imageBuffer);
    } catch (error) {
      throw new Error("Gagal memproses gambar: " + error.message);
    }
  }
  async uploadImage(imageBuffer) {
    try {
      const form = new FormData();
      const blob = new Blob([imageBuffer], {
        type: "image/jpeg"
      });
      form.append("file", blob, "processed.jpg");
      const {
        data
      } = await axios.post(this.uploadUrl, form, {
        headers: {
          ...form.headers
        }
      });
      return data;
    } catch (error) {
      throw new Error("Gagal mengunggah gambar: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const processor = new ImageProcessor();
  try {
    const data = await processor.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}