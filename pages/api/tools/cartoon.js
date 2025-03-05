import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class ImageUpscaler {
  constructor() {
    this.baseUrl = "https://imageupscaler.com";
    this.apiUrl = `${this.baseUrl}/wp-admin/admin-ajax.php`;
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/image-to-anime/`
    };
  }
  async getNonce() {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/image-to-anime/`, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      return $("#process_nonce").attr("value") || "";
    } catch (error) {
      throw new Error(`Gagal mengambil nonce: ${error.message}`);
    }
  }
  async imageUrlToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data).toString("base64");
    } catch (error) {
      throw new Error(`Gagal mengambil gambar: ${error.message}`);
    }
  }
  async upscaleImage(imageUrl, fileName = "image.jpg") {
    try {
      const nonce = await this.getNonce();
      if (!nonce) throw new Error("Nonce tidak ditemukan.");
      const base64Image = await this.imageUrlToBase64(imageUrl);
      const form = new FormData();
      form.append("action", "processing_images_adv");
      form.append("nonce", nonce);
      form.append("pid", "50105373613200053736095843124");
      form.append("function", "image-to-anime");
      form.append("mediaData[0][fileSrc]", `data:image/jpeg;base64,${base64Image}`);
      form.append("mediaData[0][fileName]", fileName);
      form.append("parameters[upscale-type]", "anime");
      form.append("parameters[save-format]", "auto");
      const response = await axios.post(this.apiUrl, form, {
        headers: this.headers
      });
      const processedHtml = response.data;
      return this.parseProcessedImage(processedHtml);
    } catch (error) {
      throw new Error(`Upscale error: ${error.message}`);
    }
  }
  parseProcessedImage(html) {
    try {
      const $ = cheerio.load(html);
      const initialImage = $(".block-before img").attr("src");
      const processedImage = $(".block-after img").attr("src");
      const downloadLink = $(".result__compiled-btns a.btn-small").attr("href");
      if (!processedImage || !downloadLink) {
        throw new Error("Gagal menemukan URL hasil gambar.");
      }
      return {
        original: initialImage ? `${initialImage}` : null,
        processed: processedImage ? `${processedImage}` : null,
        download: downloadLink ? `${downloadLink}` : null
      };
    } catch (error) {
      throw new Error(`Gagal memproses hasil gambar: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url: imageUrl
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: "URL gambar diperlukan"
    });
  }
  try {
    const upscaler = new ImageUpscaler();
    const result = await upscaler.upscaleImage(imageUrl, "example.jpg");
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}