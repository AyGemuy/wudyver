import axios from "axios";
import crypto from "crypto";
class GPT1Image {
  constructor() {
    this.baseURL = "https://gpt1image.exomlapi.com";
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    const headers = {
      "Content-Type": "application/json",
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseURL,
      referer: `${this.baseURL}/`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      "sec-ch-ua": `"Chromium";v="136", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="136", "Lemur";v="136"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": `"Windows"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": ip,
      "x-real-ip": ip,
      "x-request-id": this.randomID(8),
      ...extra
    };
    console.log("Headers dibangun:", headers);
    return headers;
  }
  async generate({
    prompt,
    size = "1024x1024",
    n = 1,
    enhance = true,
    format = "url"
  }) {
    if (!prompt) throw new Error("Deskripsikan gambar yang ingin kamu buat (gunakan properti 'prompt').");
    const body = {
      prompt: prompt,
      n: n,
      size: size,
      is_enhance: enhance,
      response_format: format
    };
    try {
      console.info(`Memproses: ${prompt}...`);
      const response = await axios.post(`${this.baseURL}/v1/images/generations`, body, {
        headers: this.buildHeaders()
      });
      console.info("Data dari server:", response.data.data);
      if (!response.data.data || response.data.data.length === 0) {
        const errorInfo = response.data.error ? `, info server: ${response.data.error}` : "";
        throw new Error(`Gagal memproses gambar. Data tidak ditemukan${errorInfo}.`);
      }
      const result = response.data.data;
      console.info(`Selesai: ${prompt}`);
      return result;
    } catch (error) {
      console.error("Terjadi kesalahan:", error.message);
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
  const generator = new GPT1Image();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}