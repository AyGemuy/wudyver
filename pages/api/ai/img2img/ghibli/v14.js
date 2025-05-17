import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import crypto from "crypto";
class GhibliStyle {
  constructor() {
    this.baseUrl = "https://ghibli-style.net";
    this.uploadUrl = `${this.baseUrl}/api/upload`;
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
  async getData(imageUrl) {
    try {
      console.log("Mengambil data gambar dari URL:", imageUrl);
      const {
        data: buffer,
        headers
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/jpeg";
      const ext = contentType.includes("jpeg") ? ".jpeg" : contentType.includes("png") ? ".png" : ".jpg";
      const filename = `upload${ext}`;
      console.log("Gambar diambil. Tipe konten:", contentType, "Nama file:", filename);
      return {
        buffer: buffer,
        contentType: contentType,
        filename: filename
      };
    } catch (err) {
      console.error("Gagal mengambil gambar:", err.message);
      throw new Error("Gagal ambil gambar: " + err.message);
    }
  }
  async generate({
    imageUrl
  }) {
    console.log("Memulai proses generate dengan imageUrl:", imageUrl);
    const {
      buffer,
      contentType,
      filename
    } = await this.getData(imageUrl);
    const form = new FormData();
    form.set("file", new Blob([buffer], {
      type: contentType
    }), filename);
    const headers = this.buildHeaders(form.headers);
    try {
      console.log("Mengunggah gambar ke:", this.uploadUrl);
      const res = await axios.post(this.uploadUrl, form, {
        headers: headers
      });
      console.log("Respons dari server:", res.data);
      return res.data;
    } catch (err) {
      console.error("Gagal mengunggah gambar:", err.message);
      throw new Error("Gagal upload gambar: " + err.message);
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
  const ghibli = new GhibliStyle();
  try {
    const data = await ghibli.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}