import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import https from "https";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
const BASE_URL = "https://ai-apps.codergautam.dev";
class ImageGenerator {
  constructor(options = {}) {
    const httpsAgent = options.useHttpsAgent ? new https.Agent({
      rejectUnauthorized: false
    }) : undefined;
    this.api = axios.create({
      baseURL: BASE_URL,
      httpsAgent: httpsAgent,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        Connection: "keep-alive",
        Origin: BASE_URL,
        Referer: `${BASE_URL}/`,
        "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        ...SpoofHead()
      }
    });
    console.log(`ImageGenerator diinisialisasi ${https.Agent ? "dengan" : "tanpa"} httpsAgent.`);
  }
  _name(length = 10) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }
  async _reg() {
    console.log("Mencoba mendaftarkan pengguna...");
    try {
      const payload = {
        uid: crypto.randomBytes(12).toString("hex"),
        email: `${this._name(5)}.${Date.now()}@gmail.com`,
        displayName: this._name(),
        photoURL: "https://i.pravatar.cc/150",
        appId: "photogpt"
      };
      const response = await this.api.post("/photogpt/create-user", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("-> LOG: Respon Data Pendaftaran:", JSON.stringify(response.data, null, 2));
      if (response.data?.success) {
        console.log("Registrasi berhasil. UID:", payload.uid);
        return payload.uid;
      }
      throw new Error(`Server merespon registrasi gagal.`);
    } catch (error) {
      console.error("ERROR di _reg:", error.message);
      throw error;
    }
  }
  async _poll(pollingUrl) {
    console.log(`Memulai polling pada: ${pollingUrl}`);
    const pollTimeout = 12e4,
      pollInterval = 3e3,
      startTime = Date.now();
    while (Date.now() - startTime < pollTimeout) {
      try {
        const res = await this.api.get(pollingUrl);
        console.log("-> LOG: Respon Data Polling:", JSON.stringify(res.data, null, 2));
        const status = res.data?.status?.toLowerCase() || "pending";
        if (["ready", "complete", "success"].includes(status)) {
          console.log("Polling selesai dengan sukses.");
          return res.data?.result ?? res.data;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error("ERROR di _poll:", error.message);
        throw error;
      }
    }
    throw new Error("Polling timeout setelah 2 menit.");
  }
  async _img(input) {
    if (input.startsWith("http")) {
      console.log("Mencoba mengunduh gambar dari URL...");
      try {
        const response = await this.api.get(input, {
          responseType: "arraybuffer"
        });
        console.log(`Gambar berhasil diunduh (Ukuran: ${response.data.length} bytes).`);
        return Buffer.from(response.data);
      } catch (error) {
        console.error("ERROR di _img saat mengunduh URL:", error.message);
        throw error;
      }
    }
    return Buffer.from(input, "base64");
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...restOptions
  }) {
    console.log("\nMemulai proses 'generate'...");
    try {
      if (!prompt) throw new Error("Paramenter 'prompt' wajib diisi.");
      const userId = await this._reg();
      const mode = imageUrl ? "Image-to-Image" : "Text-to-Image";
      console.log(`Mode yang digunakan: ${mode}`);
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("userId", userId);
      if (imageUrl) {
        const imageBuffer = Buffer.isBuffer(imageUrl) ? imageUrl : await this._img(imageUrl);
        form.append("image", imageBuffer, {
          filename: "input.jpg",
          contentType: "image/jpeg"
        });
      }
      console.log("Mengirim permintaan untuk memulai pembuatan gambar...");
      const uploadRes = await this.api.post("/photogpt/generate-image", form, {
        headers: {
          ...form.getHeaders()
        },
        ...restOptions
      });
      console.log("-> LOG: Respon Awal Generate:", JSON.stringify(uploadRes.data, null, 2));
      const pollingUrl = uploadRes.data?.pollingUrl ?? (uploadRes.data?.jobId ? `${BASE_URL}/photogpt/job/${uploadRes.data.jobId}` : null);
      if (!pollingUrl) {
        throw new Error(`Gagal mendapatkan polling URL dari respons awal.`);
      }
      return await this._poll(pollingUrl);
    } catch (error) {
      console.error(`KESALAHAN FATAL pada proses 'generate': ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new ImageGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}