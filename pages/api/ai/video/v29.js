import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class SeedanceAI {
  constructor() {
    this.apiBase = "https://seedanceai.online/api";
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.apiBase,
      jar: jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://seedanceai.online",
        pragma: "no-cache",
        referer: "https://seedanceai.online/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
  }
  async upload(image) {
    console.log("Proses: Memulai unggah gambar...");
    if (typeof image === "string" && image.startsWith("http")) {
      console.log("Proses: Input gambar sudah berupa URL, tidak perlu unggah.");
      return image;
    }
    const form = new FormData();
    let fileBuffer;
    let fileName = "image.jpg";
    if (typeof image === "string" && image.startsWith("data:image")) {
      console.log("Proses: Mengonversi base64 ke buffer...");
      const base64Data = image.split(";base64,").pop();
      fileBuffer = Buffer.from(base64Data, "base64");
      const mimeType = image.match(/data:(.*);/)?.[1] || "image/jpeg";
      fileName = `image.${mimeType.split("/")[1]}`;
    } else if (image instanceof Buffer) {
      console.log("Proses: Menggunakan buffer gambar...");
      fileBuffer = image;
    } else {
      const errorMessage = "Tipe input gambar tidak valid. Harap berikan URL, string base64, atau Buffer.";
      console.error(`Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    form.append("file", fileBuffer, {
      filename: fileName,
      contentType: "image/jpeg"
    });
    const response = await this.client.post("/uploadImage", form, {
      headers: {
        ...form.getHeaders()
      }
    });
    console.log("Proses: Unggah gambar berhasil.");
    return response.data?.data?.url;
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("Proses: Memulai pembuatan video...");
    try {
      const generationMode = imageUrl ? "img-to-video" : "text-to-video";
      console.log(`Proses: Mode generasi terdeteksi: ${generationMode}`);
      let finalImageUrl;
      if (imageUrl) {
        finalImageUrl = await this.upload(imageUrl);
        if (!finalImageUrl) {
          throw new Error("Gagal mendapatkan URL gambar setelah unggah.");
        }
        console.log(`Proses: URL gambar yang akan digunakan: ${finalImageUrl}`);
      }
      const payload = {
        model: rest.model || "seedance",
        prompt: prompt,
        resolution: rest.resolution ?? "480p",
        length: rest.length ?? 5,
        requiredCredits: rest.requiredCredits || 40,
        generationMode: generationMode,
        ...generationMode === "img-to-video" && {
          image: finalImageUrl
        }
      };
      console.log("Proses: Mengirim permintaan ke API generate-video dengan payload:", payload);
      const response = await this.client.post("/generate-video", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("Proses: Permintaan berhasil, video sedang diproses oleh server.");
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data?.message || error.response?.data || error.message;
      console.error("Error: Terjadi kesalahan selama proses pembuatan video.", errorDetails);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new SeedanceAI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}