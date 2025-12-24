import axios from "axios";
import FormData from "form-data";
import PROXY from "@/configs/proxy-url";
class BananaAIClient {
  constructor(options = {}) {
    const defaultProxies = [PROXY.url];
    console.log("CORS proxy", PROXY.url);
    this.proxies = options.proxies || defaultProxies;
    this.targetUrl = "https://bananaai.live";
    this.api = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: `${this.targetUrl}/`,
        Origin: this.targetUrl
      }
    });
  }
  async _fetchUrlAsBuffer(url) {
    try {
      const response = await this.api.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Gagal mengambil gambar dari URL: ${url}`, error.message);
      return null;
    }
  }
  async _normalizeImageToBuffer(data) {
    if (Buffer.isBuffer(data)) return data;
    if (typeof data === "string") {
      return data.startsWith("http") ? this._fetchUrlAsBuffer(data) : Buffer.from(data, "base64");
    }
    console.error("Format gambar tidak didukung:", typeof data);
    return null;
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    for (const proxy of this.proxies) {
      try {
        const baseUrl = `${proxy}/${this.targetUrl}`;
        this.api.defaults.baseURL = baseUrl;
        console.log(`\n--- Mencoba dengan proxy: ${proxy} ---`);
        console.log("1. Mendapatkan token CSRF...");
        const csrfResponse = await this.api.get("/api/auth/csrf");
        const csrfToken = csrfResponse.data?.csrfToken || "";
        const csrfCookie = csrfResponse.headers["set-cookie"]?.[0]?.split(";")[0] || "";
        if (!csrfToken || !csrfCookie) throw new Error("Gagal mendapatkan token CSRF.");
        console.log("   -> Token CSRF diterima.");
        const form = new FormData();
        const mode = imageUrl ? "image-to-image" : "text-to-image";
        form.append("prompt", prompt);
        form.append("mode", mode);
        if (imageUrl) {
          const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
          console.log(`2. Memproses ${images.length} gambar untuk mode ${mode}...`);
          for (const img of images) {
            const buffer = await this._normalizeImageToBuffer(img);
            if (buffer) form.append("images", buffer, {
              filename: "image.png",
              contentType: "image/png"
            });
          }
        } else {
          console.log(`2. Memulai mode ${mode}...`);
        }
        console.log("3. Membuat tugas generasi...");
        const createResponse = await this.api.post("/api/generate/create", form, {
          headers: {
            ...form.getHeaders(),
            Cookie: `${csrfCookie}; __Host-authjs.csrf-token=${encodeURIComponent(csrfToken)}`
          }
        });
        const taskId = createResponse.data?.data?.taskId || null;
        if (!taskId) throw new Error("Gagal membuat tugas. Respons: " + JSON.stringify(createResponse.data));
        console.log(`   -> Tugas dibuat dengan ID: ${taskId}`);
        console.log("4. Memulai polling untuk hasil gambar...");
        let finalStatusData;
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 3e3));
          const statusResponse = await this.api.get(`/api/generate/status?taskId=${taskId}`, {
            headers: {
              Cookie: csrfCookie
            }
          });
          const currentStatusData = statusResponse.data?.data;
          const state = currentStatusData?.state || "checking";
          const resultUrl = currentStatusData?.response?.resultImageUrl;
          if (resultUrl) {
            console.log(`   -> URL gambar hasil ditemukan. Tugas selesai (status: ${state}).`);
            finalStatusData = currentStatusData;
            break;
          }
          console.log(`   -> Status saat ini: ${state}, menunggu URL hasil...`);
          if (state === "error") {
            throw new Error(`Tugas gagal: ${currentStatusData?.errorMessage || "API Error"}`);
          }
        }
        console.log("5. Proses berhasil diselesaikan dengan proxy ini.");
        return {
          result: finalStatusData?.response?.resultImageUrl,
          mode: mode
        };
      } catch (error) {
        console.error(`Proxy ${proxy} gagal. Error: ${error.message}. Mencoba proxy berikutnya...`);
      }
    }
    throw new Error("Semua proxy gagal. Tidak dapat menyelesaikan permintaan.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new BananaAIClient();
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