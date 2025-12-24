import axios from "axios";
import FormData from "form-data";
import https from "https";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
class WiseTalker {
  constructor() {
    this.apiBaseUrl = "https://wisetalker.tech/api";
    this.cookie = null;
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }
  async init() {
    try {
      console.log("Proses: Inisialisasi sesi dengan WiseTalker...");
      const response = await axios.get(`${this.apiBaseUrl}/auth/csrf`, {
        httpsAgent: this.httpsAgent,
        headers: {
          accept: "*/*",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          referer: "https://wisetalker.tech/"
        }
      });
      const cookies = response.headers["set-cookie"];
      if (!cookies) throw new Error("Header Set-Cookie tidak ditemukan.");
      const csrfCookie = cookies.find(c => c.startsWith("__Host-authjs.csrf-token"));
      if (!csrfCookie) throw new Error("Cookie CSRF Auth.js tidak ditemukan.");
      this.cookie = csrfCookie.split(";")[0];
      console.log("Proses: Inisialisasi berhasil. Cookie sesi telah disimpan.");
      return true;
    } catch (error) {
      console.error("Error saat inisialisasi sesi:", error.message);
      this.cookie = null;
      return false;
    }
  }
  buildHeaders(formHeaders) {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      cookie: this.cookie,
      origin: "https://wisetalker.tech",
      priority: "u=1, i",
      referer: "https://wisetalker.tech/ai-image-editer",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead(),
      ...formHeaders
    };
  }
  async _getBuffer(imageUrl) {
    if (Buffer.isBuffer(imageUrl)) return imageUrl;
    if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("http")) {
        try {
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            httpsAgent: this.httpsAgent
          });
          const contentType = response.headers["content-type"];
          if (!contentType || !contentType.startsWith("image/")) {
            throw new Error(`URL tidak merujuk ke gambar yang valid. Diterima content-type: ${contentType}`);
          }
          return Buffer.from(response.data);
        } catch (error) {
          throw new Error(`Gagal mengunduh atau memvalidasi gambar dari URL: ${imageUrl}. Detail: ${error.message}`);
        }
      }
      return Buffer.from(imageUrl, "base64");
    }
    throw new Error("Format imageUrl tidak didukung.");
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    style = "Random",
    persona = "Random",
    aspectRatio = "16:9",
    model = "Nano Banana",
    numImages = 1
  }) {
    await this.init();
    if (!this.cookie) {
      console.error("Error: Sesi belum diinisialisasi. Harap panggil metode init() terlebih dahulu.");
      return null;
    }
    try {
      const mode = imageUrl ? "img2img" : "txt2img";
      console.log(`\n--- Memulai proses generate (Mode: ${mode}) ---`);
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("prompt", prompt);
      formData.append("style", style);
      formData.append("persona", persona);
      formData.append("aspectRatio", aspectRatio);
      formData.append("model", model);
      formData.append("numImages", numImages.toString());
      formData.append("hdPro", "false");
      formData.append("isDoubleGeneration", "false");
      if (mode === "img2img") {
        const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        console.log(`Proses: Memproses ${urls.length} gambar referensi...`);
        for (const url of urls) {
          const imageBuffer = await this._getBuffer(url);
          formData.append("image", imageBuffer, {
            filename: "image.png",
            contentType: "image/png"
          });
          console.log(`   > Gambar dari "${url.substring(0, 50)}..." berhasil ditambahkan.`);
        }
      }
      console.log("Proses: Mengirim permintaan ke API WiseTalker...");
      const headers = this.buildHeaders(formData.getHeaders());
      const response = await axios.post(`${this.apiBaseUrl}/openai-images`, formData, {
        headers: headers,
        httpsAgent: this.httpsAgent
      });
      console.log("Proses: Berhasil menerima respons dari API.");
      return response.data;
    } catch (error) {
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        if (Buffer.isBuffer(error.response.data)) {
          errorMessage = error.response.data.toString("utf-8");
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      }
      console.error("Terjadi kesalahan pada proses generate:", errorMessage);
      return null;
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
    const ai = new WiseTalker();
    const response = await ai.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}