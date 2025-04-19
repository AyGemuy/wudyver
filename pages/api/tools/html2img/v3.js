import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class FileFormatConvert {
  constructor() {
    this.baseUrl = "https://api.products.fileformat.app/word-processing/conversion/api";
    this.downloadUrl = "https://products.fileformat.app/word-processing/conversion/Download";
    this.client = axios.create({
      withCredentials: true
    });
  }
  async convertHTMLToImage({
    html,
    name = `output_${Date.now()}`,
    format = "PNG"
  }) {
    try {
      format = format.toUpperCase();
      const url = `${this.baseUrl}/convert?outputType=${format}`;
      const form = new FormData();
      form.append("1", new Blob([html], {
        type: "text/html"
      }), `${name}.html`);
      const {
        data
      } = await this.client.post(url, form, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": `multipart/form-data; boundary=${form.boundary}`,
          origin: "https://products.fileformat.app",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://products.fileformat.app/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      if (!data?.id) throw new Error("Konversi gagal atau ID tidak ditemukan.");
      const downloadId = encodeURIComponent(data.id);
      return `${this.downloadUrl}?id=${downloadId}`;
    } catch (error) {
      console.error("Error saat mengonversi HTML ke gambar:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new FileFormatConvert();
    const result = await converter.convertHTMLToImage(params);
    return res.status(200).json({
      url: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}