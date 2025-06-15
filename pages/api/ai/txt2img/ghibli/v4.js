import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class GhibliImageGenerator {
  constructor() {
    this.apiUrl = "https://ghibliimagegenerator.net/api/generate-image";
    this.uploadUrl = "https://i.supa.codes/api/upload";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
      Referer: "https://ghibliimagegenerator.net/generator"
    };
  }
  async generate({
    prompt = "mem",
    style = "Spirited Away"
  }) {
    try {
      console.log(`[+] Mengirim prompt "${prompt}" dengan gaya "${style}"...`);
      const res = await axios.post(this.apiUrl, {
        prompt: prompt,
        style: style
      }, {
        headers: this.headers
      });
      const imageBase64 = res?.data?.imageData?.split(",")?.[1];
      if (!imageBase64) throw new Error("imageData tidak ditemukan dalam response.");
      console.log("[+] Gambar berhasil dibuat, mengubah base64 ke buffer...");
      const buffer = Buffer.from(imageBase64, "base64");
      console.log("[+] Mengupload gambar ke supa.codes...");
      const uploaded = await this.uploadImage(buffer);
      console.log("[✓] Gambar berhasil diupload.");
      return uploaded;
    } catch (err) {
      console.error("[X] Terjadi kesalahan:", err.message);
      throw err;
    }
  }
  async uploadImage(buffer) {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer]), "image.png");
      const res = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers
        }
      });
      if (!res.data) throw new Error("Upload gagal.");
      return res.data;
    } catch (err) {
      console.error("[X] Gagal upload:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const generator = new GhibliImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}