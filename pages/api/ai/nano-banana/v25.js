import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class Nano2Image {
  constructor() {
    const jar = new CookieJar();
    this.api = wrapper(axios.create({
      baseURL: "https://nano2image.com/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://nano2image.com",
        pragma: "no-cache",
        referer: "https://nano2image.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-from-site": "1",
        ...SpoofHead()
      }
    }));
    this.api.defaults.jar = jar;
    this.isInitialized = false;
    console.log("Instance Nano2Image dibuat. Sesi akan dibuat pada permintaan pertama.");
  }
  async init() {
    console.log("Memulai inisialisasi sesi...");
    try {
      const sessionResponse = await this.api.get("/session");
      if (sessionResponse.data?.session !== "created") {
        throw new Error("Gagal membuat sesi.");
      }
      console.log("Sesi berhasil dibuat.");
      const limitResponse = await this.api.get("/rate-limit");
      const limit = limitResponse.data;
      console.log(`Pengecekan limit: ${limit?.dailyRemaining}/${limit?.dailyLimit} harian tersisa.`);
      if (!limit?.allowed || limit?.dailyRemaining === 0) {
        throw new Error(`Limit harian tercapai. Sisa: ${limit?.dailyRemaining}. Reset pada: ${new Date(limit?.dailyResetTime).toString()}`);
      }
      this.isInitialized = true;
      console.log("Inisialisasi berhasil dan limit tersedia.");
    } catch (error) {
      console.error("Gagal melakukan inisialisasi:", error.message);
      throw error;
    }
  }
  async u(buffer) {
    console.log("Mengunggah gambar...");
    try {
      const form = new FormData();
      form.append("file", buffer, {
        filename: `image-${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      const response = await this.api.post("/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Unggah berhasil:", response.data?.url);
      return response.data?.url;
    } catch (error) {
      console.error("Gagal mengunggah gambar:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      console.log(`Memulai proses generate untuk prompt: "${prompt}"`);
      let finalImageUrl = null;
      if (imageUrl) {
        console.log("Mode: Image-to-Image");
        let imageBuffer;
        if (Buffer.isBuffer(imageUrl)) {
          console.log("Input adalah Buffer.");
          imageBuffer = imageUrl;
        } else if (imageUrl.startsWith("data:image")) {
          console.log("Input adalah Base64.");
          imageBuffer = Buffer.from(imageUrl.split(",")[1], "base64");
        } else if (imageUrl.startsWith("http")) {
          console.log("Input adalah URL, mengunduh...");
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data);
        } else {
          throw new Error("Format imageUrl tidak didukung.");
        }
        finalImageUrl = await this.u(imageBuffer);
      } else {
        console.log("Mode: Text-to-Image");
      }
      const payload = {
        promptText: prompt,
        imageUrl: finalImageUrl,
        size: rest?.size || "1x1",
        model: rest?.model ? rest.model : "standard"
      };
      console.log("Mengirim payload ke API generate:", payload);
      const response = await this.api.post("/generate", payload, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log("Proses generate berhasil.");
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan selama proses generate:", error.response?.data || error.message);
      throw error;
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
  const api = new Nano2Image();
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