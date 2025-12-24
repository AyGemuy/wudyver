import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class PadletImageGenerator {
  constructor() {
    this.padletApiBase = "https://internal.users.n8n.cloud/webhook/ai_image_generator";
    this.baseUrl = "https://n8n.io";
    console.log("[Inisialisasi] Kelas PadletImageGenerator diinisialisasi.");
  }
  randomID(length = 8) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders() {
    const requestId = this.randomID(8);
    return {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: this.baseUrl,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-request-id": requestId,
      ...SpoofHead()
    };
  }
  async generate({
    prompt = "a futuristic city skyline at sunset, cyberpunk style, neon lights, high detail"
  }) {
    const url = this.padletApiBase;
    const headers = this.buildHeaders();
    const body = {
      prompt: prompt
    };
    console.log(`[Padlet AI] Mengirim permintaan pembuatan gambar dengan prompt: "${prompt}"...`);
    console.log("[Padlet AI] Menggunakan Headers:", headers);
    console.log("[Padlet AI] Mengirim Body:", body);
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