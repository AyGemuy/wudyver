import axios from "axios";
import crypto from "crypto";
class ImagenGenerator {
  constructor() {
    this.baseUrl = "https://imagen.exomlapi.com";
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
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
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
    model = "imagen_3",
    size = "1024x1792",
    response_format = "url"
  }) {
    const payload = {
      prompt: prompt,
      model: model,
      size: size,
      response_format: response_format
    };
    try {
      const response = await axios.post(`${this.baseUrl}/v1/images/generations`, payload, {
        headers: this.buildHeaders()
      });
      return response.data;
    } catch (error) {
      console.error("Error saat menghasilkan gambar Imagen:", error.response ? error.response.data : error.message);
      throw new Error("Gagal menghasilkan gambar dari Imagen.");
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
  const api = new ImagenGenerator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}