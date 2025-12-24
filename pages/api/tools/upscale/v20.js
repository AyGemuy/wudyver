import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class Flatai {
  constructor() {
    console.log("Proses: Flatai class diinisialisasi");
    this.config = null;
    this.isInitialized = false;
    this.httpClient = axios.create({
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        Origin: "https://flatai.org",
        Referer: "https://flatai.org/free-ai-image-quality-enhancer-no-registration/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
  }
  async init() {
    if (this.isInitialized) {
      return;
    }
    console.log("Proses: Memulai inisialisasi data dari flatai.org...");
    try {
      const response = await this.httpClient.get(proxy + "https://flatai.org/free-ai-image-quality-enhancer-no-registration/");
      const $ = cheerio.load(response.data);
      let found = false;
      $("script#jquery-core-js-extra").each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent?.includes("var my_ajax_object")) {
          const jsonDataString = scriptContent.match(/var my_ajax_object = (.*?);/s);
          if (jsonDataString?.[1]) {
            const data = JSON.parse(jsonDataString[1]);
            this.config = data;
            this.isInitialized = true;
            found = true;
            console.log(`Proses: Inisialisasi berhasil. Konfigurasi telah dimuat.`);
            return false;
          }
        }
      });
      if (!found) {
        throw new Error("Variabel my_ajax_object tidak ditemukan di script manapun.");
      }
    } catch (error) {
      console.error("Error selama inisialisasi:", error.message);
      throw error;
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    console.log("Proses: Memulai proses generate gambar...");
    await this.init();
    if (!this.isInitialized || !this.config) {
      throw new Error("Inisialisasi gagal, tidak dapat melanjutkan proses generate.");
    }
    const ajaxUrl = this.config?.ajax_url;
    const action = this.config?.ai_image_upscaler_action;
    const nonce = this.config?.ai_image_upscaler_nonce;
    if (!ajaxUrl || !action || !nonce) {
      throw new Error("Informasi ajax_url, action, atau nonce untuk upscaler tidak ditemukan dalam konfigurasi.");
    }
    try {
      let imageBuffer;
      let filename = "upload.png";
      if (Buffer.isBuffer(imageUrl)) {
        console.log("Proses: Input gambar adalah Buffer.");
        imageBuffer = imageUrl;
      } else if (imageUrl.startsWith("http")) {
        console.log("Proses: Mengunduh gambar dari URL...");
        const response = await this.httpClient.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageBuffer = Buffer.from(response.data);
        filename = imageUrl.split("/").pop() || filename;
      } else {
        console.log("Proses: Input gambar adalah base64.");
        imageBuffer = Buffer.from(imageUrl, "base64");
      }
      const form = new FormData();
      form.append("action", action);
      form.append("nonce", nonce);
      form.append("image", imageBuffer, {
        filename: filename
      });
      form.append("scale", rest.scale || "2");
      console.log(`Proses: Mengirim permintaan ke ${ajaxUrl}...`);
      const {
        data
      } = await this.httpClient.post(proxy + ajaxUrl, form, {
        headers: form.getHeaders()
      });
      console.log("Proses: Permintaan berhasil.");
      return data;
    } catch (error) {
      const errorMessage = error.response?.data?.data?.message || error.response?.data?.message || error.message;
      console.error("Error selama generate gambar:", errorMessage);
      throw new Error(errorMessage);
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
    const api = new Flatai();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}