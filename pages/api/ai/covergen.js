import axios from "axios";
import https from "https";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
class ApiClient {
  constructor(customConfig = {}, sessionId = null) {
    const defaultConfig = {
      covergen: {
        baseUrl: "https://covergen.pro/api",
        endpoints: {
          generate: "/generate"
        }
      },
      wudysoft: {
        baseUrl: `https://${apiConfig.DOMAIN_URL}/api`,
        endpoints: {
          upload: "/tools/upload"
        }
      }
    };
    this.config = {
      ...defaultConfig,
      ...customConfig
    };
    this.sessionId = sessionId || Math.random().toString(36).substring(2, 15);
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    console.log(`ApiClient diinisialisasi dengan Session ID: ${this.sessionId}`);
  }
  buildHeaders() {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://covergen.pro",
      priority: "u=1, i",
      referer: "https://covergen.pro/en",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      cookie: `covergen_session_id=${this.sessionId}`,
      ...SpoofHead()
    };
    return headers;
  }
  async _toBase64DataURI(imageUrl) {
    let buffer;
    if (Buffer.isBuffer(imageUrl)) {
      buffer = imageUrl;
    } else if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("http")) {
        try {
          console.log(`   > Mengunduh: ${imageUrl}`);
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            httpsAgent: this.httpsAgent
          });
          buffer = Buffer.from(response.data);
        } catch (error) {
          throw new Error(`Gagal mengunduh gambar dari URL: ${imageUrl}. Error: ${error.message}`);
        }
      } else {
        try {
          buffer = Buffer.from(imageUrl, "base64");
        } catch (error) {
          throw new Error("String imageUrl bukan base64 yang valid.");
        }
      }
    } else {
      throw new Error("Format imageUrl tidak didukung.");
    }
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    style = "modern",
    platform = "none"
  }) {
    try {
      const referenceImages = [];
      const mode = imageUrl ? "image" : "text";
      console.log(`\n--- Memulai proses generate (Mode: ${mode}) ---`);
      if (mode === "image") {
        const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        console.log(`Proses: Mengonversi ${urls.length} gambar...`);
        for (const url of urls) {
          const base64Image = await this._toBase64DataURI(url);
          referenceImages.push(base64Image);
          console.log(`   > Selesai: ${url}`);
        }
        console.log("Proses: Semua gambar referensi berhasil dikonversi.");
      }
      const payload = {
        prompt: prompt,
        mode: mode,
        style: style,
        platform: platform,
        dimensions: {
          label: "No Platform (Pure Prompt)"
        }
      };
      if (referenceImages.length > 0) {
        payload.referenceImages = referenceImages;
      }
      console.log("Proses: Mengirim permintaan ke API CoverGen...");
      const url = `${this.config.covergen.baseUrl}${this.config.covergen.endpoints.generate}`;
      const response = await axios.post(url, payload, {
        headers: this.buildHeaders(),
        httpsAgent: this.httpsAgent
      });
      console.log("Proses: Berhasil menerima respons dari API CoverGen.");
      return response.data;
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Terjadi kesalahan pada proses generate:", errorMessage);
      return null;
    }
  }
  async upload(base64Image) {
    if (!base64Image || !base64Image.startsWith("data:image/png;base64,")) {
      console.error("Error [Upload]: Format base64 tidak valid atau kosong untuk diupload.");
      return null;
    }
    try {
      console.log(`\n--- Memulai proses upload ke ${apiConfig.DOMAIN_URL} ---`);
      const base64Data = base64Image.replace(/^data:image\/png;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: `generated-${Date.now()}.png`,
        contentType: "image/png"
      });
      console.log("Proses: Mengirim gambar sebagai form-data ke ${apiConfig.DOMAIN_URL}...");
      const url = `${this.config.wudysoft.baseUrl}${this.config.wudysoft.endpoints.upload}`;
      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("Proses: Berhasil menerima respons dari ${apiConfig.DOMAIN_URL}.");
      return response.data;
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error(`Terjadi kesalahan saat upload ke ${apiConfig.DOMAIN_URL}:`, errorMessage);
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
    const ai = new ApiClient();
    const response = await ai.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}