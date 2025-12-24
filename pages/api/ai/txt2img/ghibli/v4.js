import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class GhibliImageGenerator {
  constructor() {
    this.apiUrl = "https://ghibliimagegenerator.net/api/generate-image";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
      Referer: "https://ghibliimagegenerator.net/generator",
      ...SpoofHead()
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
      console.log("[+] Mengupload gambar...");
      const uploaded = await this.uploadImage(buffer);
      console.log("[✓] Gambar berhasil diupload.");
      return uploaded;
    } catch (err) {
      console.error("[X] Terjadi kesalahan:", err.message);
      throw err;
    }
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
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
      error: "Internal Server Error"
    });
  }
}