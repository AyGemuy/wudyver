import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class PadletImageGenerator {
  constructor() {
    this.padletApiBase = "https://ta.padlet.com/api";
    this.baseUrl = "https://ta.padlet.com";
    console.log("[Inisialisasi] Kelas PadletImageGenerator diinisialisasi.");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    return {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/image-generator/nlp8YbOlKX`,
      Origin: this.baseUrl,
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
  }
  async generate({
    prompt = "a futuristic city skyline at sunset, cyberpunk style, neon lights, high detail",
    ratio = "16:9"
  }) {
    const url = `${this.padletApiBase}/ai-generate-image`;
    const headers = this.buildHeaders();
    const body = {
      prompt: prompt,
      ratio: ratio
    };
    console.log(`[Padlet AI] Mengirim permintaan pembuatan gambar dengan prompt: "${prompt}" dan rasio: "${ratio}"...`);
    try {
      const response = await axios.post(url, body, {
        headers: headers
      });
      console.log("[Padlet AI] Respons berhasil diterima:");
      console.log(JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`[Padlet AI] Gagal menghasilkan gambar: ${error.message}`);
      if (error.response) {
        console.error(`[Padlet AI] Status Server: ${error.response.status}`);
        console.error(`[Padlet AI] Data Respons Error: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error("[Padlet AI] Tidak ada respons diterima dari server.");
      } else {
        console.error("[Padlet AI] Error saat mengkonfigurasi permintaan:", error.message);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new PadletImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}