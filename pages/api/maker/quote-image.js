import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class ApiClient {
  constructor() {
    this.baseURL = "https://socialbu.com";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true
    }));
    this.csrfToken = null;
    console.log("ApiClient initialized");
  }
  async _buildHeaders(type = "page") {
    console.log(`Membangun header untuk tipe: ${type}`);
    const baseHeaders = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      ...SpoofHead()
    };
    if (type === "api") {
      const xsrfTokenCookie = await this.jar.getCookieString(this.baseURL);
      const xsrfToken = xsrfTokenCookie.split(";").find(c => c.trim().startsWith("XSRF-TOKEN="))?.split("=")[1] || null;
      if (!this.csrfToken || !xsrfToken) {
        throw new Error("Token CSRF atau XSRF tidak tersedia. Jalankan init() terlebih dahulu.");
      }
      return {
        ...baseHeaders,
        accept: "*/*",
        "content-type": "application/json",
        origin: this.baseURL,
        referer: `${this.baseURL}/tools/quote-image-generator`,
        "x-requested-with": "XMLHttpRequest",
        "x-csrf-token": this.csrfToken,
        "x-xsrf-token": decodeURIComponent(xsrfToken)
      };
    }
    return {
      ...baseHeaders,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin"
    };
  }
  async init() {
    console.log("Menginisialisasi dan mengambil token...");
    try {
      const headers = await this._buildHeaders("page");
      const response = await this.client.get("/tools/quote-image-generator", {
        headers: headers
      });
      console.log("Cookie berhasil didapatkan dan disimpan.");
      const $ = cheerio.load(response.data);
      this.csrfToken = $('meta[name="csrf-token"]').attr("content");
      if (this.csrfToken) {
        console.log("CSRF Token berhasil diekstrak:", this.csrfToken);
        return true;
      } else {
        console.error("Gagal menemukan meta tag csrf-token.");
        return false;
      }
    } catch (error) {
      console.error("Gagal melakukan inisialisasi:", error.message);
      return false;
    }
  }
  async generate({
    quote,
    instruction
  } = {}) {
    console.log("Proses generate dimulai...");
    try {
      if (!this.csrfToken) {
        const initialized = await this.init();
        if (!initialized) {
          return {
            success: false,
            message: "Inisialisasi API Client gagal."
          };
        }
      }
      const url = "/api/v1/generate/forms/quote_image_generator";
      const data = {
        quote: quote || "Default Quote",
        instruction: instruction || "Default Instruction"
      };
      const headers = await this._buildHeaders("api");
      console.log("Mengirim request POST ke:", url);
      const response = await this.client.post(url, data, {
        headers: headers
      });
      const responseData = response.data;
      console.log("Request POST berhasil");
      if (responseData.image_url) {
        console.log("Data gambar base64 diterima, sedang dikonversi ke buffer.");
        const base64Data = responseData.image_url.split(",")[1];
        const imageBuffer = Buffer.from(base64Data, "base64");
        return {
          success: true,
          imageBuffer: imageBuffer
        };
      } else {
        console.log("Gagal mendapatkan gambar atau format tidak sesuai.");
        return {
          success: false,
          message: responseData.message || "Gagal membuat gambar dari API eksternal."
        };
      }
    } catch (error) {
      console.error("Terjadi error saat proses generate di dalam class:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.quote) {
    return res.status(400).json({
      error: "Paramenter 'quote' dibutuhkan."
    });
  }
  try {
    const ai = new ApiClient();
    const result = await ai.generate(params);
    if (result.success && result.imageBuffer) {
      console.log("Mengirim imageBuffer sebagai respons.");
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(result.imageBuffer);
    } else {
      console.log("Generate gagal, mengirim pesan error sebagai JSON.");
      return res.status(400).json({
        error: result.message || "Terjadi kesalahan yang tidak diketahui."
      });
    }
  } catch (error) {
    console.error("Terjadi error di handler API:", error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.message || error.message || "Internal Server Error"
    });
  }
}