import axios from "axios";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
import SpoofHead from "@/lib/spoof-head";
class GeminiApi {
  constructor() {
    this.baseURL = "https://api.nanobananas.me/prod-api/gemini/gen";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID",
      Connection: "keep-alive",
      Origin: "https://www.nanobananas.me",
      Referer: "https://www.nanobananas.me/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      ...SpoofHead()
    };
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    console.log("Memulai proses pembuatan...");
    try {
      const form = new FormData();
      console.log("Membuat FormData...");
      const promptValue = prompt;
      form.append("prompt", promptValue);
      console.log(`Prompt ditambahkan: ${promptValue}`);
      if (imageUrl) {
        console.log(`Memproses imageUrl: ${typeof imageUrl === "string" ? imageUrl.substring(0, 30) + "..." : "Buffer"}`);
        let imageData;
        let filename;
        if (Buffer.isBuffer(imageUrl)) {
          imageData = imageUrl;
          filename = rest?.filename || "image-buffer.png";
        } else if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageData = Buffer.from(response.data);
          filename = rest?.filename || "image-from-url.png";
        } else if (typeof imageUrl === "string") {
          imageData = Buffer.from(imageUrl, "base64");
          filename = rest?.filename || "image-base64.png";
        }
        if (imageData) {
          form.append("file", imageData, {
            filename: filename
          });
          console.log(`File gambar ditambahkan dengan nama file: ${filename}`);
        } else {
          console.log("Tipe imageUrl tidak didukung atau tidak valid.");
        }
      } else {
        console.log("Tidak ada imageUrl yang disediakan, menjalankan text-to-image.");
      }
      console.log("Mengirim permintaan ke API...");
      const response = await axios.post(this.baseURL, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      console.log("Berhasil menerima respons dari API.");
      return response?.data ?? "Tidak ada data yang diterima.";
    } catch (error) {
      console.error("Terjadi kesalahan:", error.message);
      const errorMessage = error?.response?.data?.message || "Terjadi kesalahan yang tidak diketahui.";
      return {
        error: true,
        message: errorMessage
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new GeminiApi();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}