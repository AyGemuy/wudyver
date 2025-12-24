import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class ApiHandler {
  constructor(baseURL, options) {
    console.log("Proses: Menginisialisasi ApiHandler...");
    const defaultHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      locale: "en-US",
      origin: "https://removebg.one",
      platform: "PC",
      priority: "u=1, i",
      product: "REMOVEBG",
      referer: "https://removebg.one/upload?trigger=yes",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.api = axios.create({
      baseURL: baseURL || "https://removebg.one/api/predict/",
      headers: options?.headers ? {
        ...defaultHeaders,
        ...options.headers
      } : defaultHeaders
    });
    console.log("Proses: ApiHandler berhasil diinisialisasi.");
  }
  async _handleImageUrl(imageUrl) {
    console.log("Proses: Menangani imageUrl...");
    if (Buffer.isBuffer(imageUrl)) {
      console.log("Proses: imageUrl terdeteksi sebagai Buffer.");
      return imageUrl;
    }
    if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("http")) {
        console.log("Proses: imageUrl terdeteksi sebagai URL, mengunduh gambar...");
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      } else {
        console.log("Proses: imageUrl terdeteksi sebagai base64.");
        return Buffer.from(imageUrl, "base64");
      }
    }
    throw new Error("Tipe imageUrl tidak valid. Harap berikan URL, base64, atau Buffer.");
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    console.log("Proses: Memulai fungsi generate...");
    try {
      const imageBuffer = await this._handleImageUrl(imageUrl);
      const form = new FormData();
      const filename = rest?.filename || "image.jpg";
      const contentType = rest?.contentType || "image/jpeg";
      form.append("file", imageBuffer, {
        filename: filename,
        contentType: contentType
      });
      console.log("Proses: Mengirim permintaan ke API...");
      const response = await this.api.post("/v2", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Permintaan berhasil.");
      return response?.data;
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat generate.", error?.message);
      console.error("Detail Error:", error?.response?.data || "Tidak ada data respons error.");
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const api = new ApiHandler();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}