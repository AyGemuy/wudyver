import axios from "axios";
import FormData from "form-data";
import https from "https";
import SpoofHead from "@/lib/spoof-head";
class BananaAI {
  constructor() {
    this.targetUrl = "https://bananaai.live";
    this.cookieJar = {};
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    });
    this.api = axios.create({
      baseURL: this.targetUrl,
      httpsAgent: this.httpsAgent,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        origin: this.targetUrl,
        referer: `${this.targetUrl}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.api.interceptors.response.use(response => {
      this._extractCookies(response.headers);
      return response;
    }, error => {
      if (error.response) {
        this._extractCookies(error.response.headers);
      }
      return Promise.reject(error);
    });
    this.api.interceptors.request.use(config => {
      const cookieString = this._buildCookieString();
      if (cookieString) {
        config.headers["Cookie"] = cookieString;
      }
      return config;
    });
  }
  _extractCookies(headers) {
    const setCookie = headers["set-cookie"];
    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      cookies.forEach(cookieStr => {
        const parts = cookieStr.split(";")[0].split("=");
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        if (key && value) {
          this.cookieJar[key] = value;
        }
      });
    }
  }
  _buildCookieString() {
    return Object.entries(this.cookieJar).map(([key, val]) => `${key}=${val}`).join("; ");
  }
  async _resolveMedia(media) {
    try {
      if (Buffer.isBuffer(media)) {
        console.log("   -> Media dideteksi sebagai Buffer.");
        return media;
      }
      if (typeof media === "string") {
        if (/^https?:\/\//.test(media)) {
          console.log(`   -> Mengunduh media dari URL: ${media}`);
          const response = await axios.get(media, {
            responseType: "arraybuffer",
            httpsAgent: this.httpsAgent,
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          });
          return Buffer.from(response.data);
        }
        console.log("   -> Media dideteksi sebagai Base64.");
        const base64Data = media.replace(/^data:image\/\w+;base64,/, "");
        return Buffer.from(base64Data, "base64");
      }
      throw new Error("Format media tidak dikenali (bukan Buffer, URL, atau Base64 string)");
    } catch (error) {
      console.error("   [x] Gagal memproses media:", error.message);
      return null;
    }
  }
  async generate({
    prompt,
    imageUrl
  }) {
    console.log("\n=== Memulai BananaAI Generate ===");
    try {
      if (Object.keys(this.cookieJar).length === 0) {
        console.log("[1/4] Menginisialisasi sesi & cookie...");
        await this.api.get("/api/auth/csrf");
      } else {
        console.log("[1/4] Menggunakan sesi cookie yang tersimpan.");
      }
      console.log("[2/4] Mempersiapkan payload data...");
      const form = new FormData();
      const mode = imageUrl ? "image-to-image" : "text-to-image";
      form.append("prompt", prompt);
      form.append("mode", mode);
      if (imageUrl) {
        const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        console.log(`      Mode: ${mode} (${images.length} gambar)`);
        for (const [index, img] of images.entries()) {
          const buffer = await this._resolveMedia(img);
          if (buffer) {
            form.append("images", buffer, {
              filename: `image_${index}.jpg`,
              contentType: "image/jpeg"
            });
          } else {
            console.warn(`      [!] Gambar ke-${index + 1} gagal diproses, dilewati.`);
          }
        }
      } else {
        console.log(`      Mode: ${mode}`);
      }
      console.log("[3/4] Mengirim permintaan pembuatan tugas...");
      const createHeaders = {
        ...form.getHeaders()
      };
      const createResponse = await this.api.post("/api/generate/create", form, {
        headers: createHeaders
      });
      const taskId = createResponse.data?.data?.taskId;
      if (!taskId) {
        throw new Error(`Gagal membuat tugas. Response: ${JSON.stringify(createResponse.data)}`);
      }
      console.log(`      Task ID diterima: ${taskId}`);
      console.log("[4/4] Menunggu hasil (Polling)...");
      let finalResult = null;
      let attempt = 0;
      while (true) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 3e3));
        const statusResponse = await this.api.get(`/api/generate/status?taskId=${taskId}`);
        const statusData = statusResponse.data?.data;
        if (!statusData) {
          console.log(`      Attempt ${attempt}: Tidak ada data status...`);
          continue;
        }
        const state = statusData.state || "unknown";
        console.log(`      Attempt ${attempt}: Status = ${state}`);
        if (statusData.response?.resultImageUrl) {
          finalResult = statusData.response.resultImageUrl;
          console.log("   -> Selesai! Gambar ditemukan.");
          break;
        }
        if (state === "error" || state === "failed") {
          throw new Error(`Tugas gagal dari server: ${statusData.errorMessage || "Unknown Error"}`);
        }
        if (attempt > 20) {
          throw new Error("Polling timeout (terlalu lama).");
        }
      }
      console.log("=== Proses Selesai ===\n");
      return {
        status: true,
        mode: mode,
        result: finalResult,
        taskId: taskId
      };
    } catch (error) {
      console.error("\n[x] Terjadi Kesalahan Fatal:");
      console.error(`    Pesan: ${error.message}`);
      if (error.response) {
        console.error(`    HTTP Status: ${error.response.status}`);
        console.error(`    Response Data:`, JSON.stringify(error.response.data));
      }
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
  const api = new BananaAI();
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