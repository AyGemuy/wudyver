import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class ImageDescriber {
  constructor(type = "freechat") {
    this.apiUrl = `https://imagedescriber.app/api/${type}`;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://imagedescriber.app",
      priority: "u=1, i",
      referer: "https://imagedescriber.app/chat-with-image",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchImageBuffer(imageUrl) {
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      if (!res.data) throw new Error("Gagal mengunduh gambar");
      return res.data;
    } catch (error) {
      console.error("Gagal mengambil gambar:", error.message);
      return null;
    }
  }
  async describeImage(imageUrl, prompt = "describing the image below for image generation. Focus on essential details for accurate results.", lang = "en") {
    try {
      const buffer = await this.fetchImageBuffer(imageUrl);
      if (!buffer) return null;
      const blob = new Blob([buffer], {
        type: "image/jpeg"
      });
      const form = new FormData();
      form.append("file", blob, "image.jpg");
      form.append("prompt", prompt);
      form.append("history", "[]");
      form.append("lang", lang);
      const response = await axios.post(this.apiUrl, form, {
        headers: {
          ...this.headers
        }
      });
      return this.parseResponse(response.data);
    } catch (error) {
      console.error("Gagal mendapatkan deskripsi:", error.message);
      return null;
    }
  }
  parseResponse(rawData) {
    try {
      const jsonMatches = rawData.match(/\{.*?\}/g);
      if (!jsonMatches) throw new Error("Format data tidak valid");
      let imageUrl = null;
      let description = "";
      jsonMatches.forEach(jsonStr => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.input_image_url) imageUrl = parsed.input_image_url;
          if (parsed.description) description += parsed.description;
        } catch (e) {
          console.error("Gagal parse JSON:", jsonStr);
        }
      });
      return {
        link: imageUrl,
        text: description.trim()
      };
    } catch (error) {
      console.error("Gagal memproses output:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url: imageUrl,
    prompt = "describing the image below for image generation. Focus on essential details for accurate results.",
    lang = "en",
    type = "freechat"
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    console.log("⛔ URL gambar tidak ditemukan.");
    return res.status(400).json({
      error: "Parameter url harus diisi!"
    });
  }
  const describer = new ImageDescriber(type);
  try {
    console.log("🚀 Memulai proses deskripsi gambar...");
    const result = await describer.describeImage(imageUrl, prompt, lang);
    console.log("✅ Proses deskripsi selesai.");
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat memproses deskripsi gambar:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan dalam proses deskripsi gambar."
    });
  }
}