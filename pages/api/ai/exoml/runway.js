import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";
class RunwayGenerator {
  constructor() {
    this.baseUrl = "https://runway.exomlapi.com";
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
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
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
    prompt = "",
    ratio = "9:16",
    imageUrl = null
  }) {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("aspectRatio", ratio);
    if (imageUrl) {
      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        const imageBuffer = Buffer.from(imageResponse.data);
        const contentType = imageResponse.headers["content-type"];
        const filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1) || "image.png";
        const imageBlob = new Blob([imageBuffer], {
          type: contentType
        });
        formData.append("image", imageBlob, filename);
      } catch (error) {
        console.error("Error fetching image from URL:", error);
        throw new Error("Gagal mengambil gambar dari URL yang disediakan.");
      }
    }
    try {
      const response = await axios.post(`${this.baseUrl}/v1/images/generations`, formData, {
        headers: {
          ...this.buildHeaders(),
          ...formData.headers
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error saat menghasilkan gambar:", error.response ? error.response.data : error.message);
      throw new Error("Gagal menghasilkan gambar.");
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
  const api = new RunwayGenerator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}