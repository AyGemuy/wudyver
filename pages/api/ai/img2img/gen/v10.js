import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
class AIFigurine {
  constructor() {
    this.api = axios.create({
      baseURL: "https://aifigurine.art",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://aifigurine.art/",
        Origin: "https://aifigurine.art",
        ...SpoofHead()
      }
    });
    this.csrfToken = null;
  }
  async _getCsrf() {
    console.log("Proses: Mendapatkan token CSRF...");
    try {
      const response = await this.api.get("/api/auth/csrf");
      const token = response.data?.csrfToken;
      if (!token) {
        throw new Error("Gagal mendapatkan csrfToken dari respons.");
      }
      this.csrfToken = token;
      console.log("Proses: Token CSRF berhasil didapatkan.");
    } catch (error) {
      console.error("Error saat mengambil token CSRF:", error.message);
      throw error;
    }
  }
  async _imgToBuf(imageUrl) {
    console.log("Proses: Mengonversi input gambar ke buffer...");
    if (Buffer.isBuffer(imageUrl)) {
      console.log("Proses: Input sudah dalam format Buffer.");
      return imageUrl;
    }
    if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("http")) {
        console.log("Proses: Mengunduh gambar dari URL...");
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data, "binary");
      }
      if (imageUrl.startsWith("data:")) {
        console.log("Proses: Mengonversi Base64 ke Buffer...");
        const base64Data = imageUrl.split(",")[1];
        return Buffer.from(base64Data, "base64");
      }
    }
    throw new Error("Format imageUrl tidak didukung. Harap gunakan URL, Base64, atau Buffer.");
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    console.log("Memulai proses generate gambar...");
    try {
      await this._getCsrf();
      const imageBuffer = await this._imgToBuf(imageUrl);
      const form = new FormData();
      form.append("image", imageBuffer, {
        filename: "uploaded-image.jpg",
        contentType: "image/jpeg"
      });
      form.append("prompt", prompt);
      form.append("model", rest.model || "gemini-2.5-flash-image");
      form.append("size", rest.size ? rest.size : "1x1");
      form.append("n", rest.n || 1);
      console.log("Proses: Mengunggah gambar dan data...");
      const response = await this.api.post("/api/image-edit", form, {
        headers: {
          ...form.getHeaders(),
          Cookie: `__Host-authjs.csrf-token=${this.csrfToken}`
        }
      });
      console.log("Sukses: Gambar berhasil diproses oleh API.");
      return response?.data;
    } catch (error) {
      console.error("Error selama proses generate:", error.message);
      if (error.response) {
        console.error("Data Respons Error:", error.response?.data);
      }
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new AIFigurine();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}