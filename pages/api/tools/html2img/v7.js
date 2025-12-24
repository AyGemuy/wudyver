import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData,
  Blob
} from "formdata-node";
class SheetizeConvert {
  constructor() {
    this.baseUrl = "https://products.sheetize.app/Products/conversion/conversion/api";
    this.downloadUrl = `${this.baseUrl}/Download`;
    this.client = axios.create({
      withCredentials: true
    });
  }
  async getFileKey() {
    try {
      const response = await this.client.get("https://products.sheetize.app/id/conversion/html-to-image");
      const $ = cheerio.load(response.data);
      const key = $("#dropFileId").val();
      if (!key || isNaN(key)) throw new Error("Key tidak ditemukan atau tidak valid.");
      const cookie = response.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ");
      if (!cookie) throw new Error("Cookie tidak ditemukan.");
      return {
        key: key,
        cookie: cookie
      };
    } catch (error) {
      console.error("Gagal mendapatkan key file:", error.message);
      return null;
    }
  }
  async convertHTMLToImage({
    html,
    name = `output_${Date.now()}`,
    format = "PNG"
  }) {
    try {
      const fileData = await this.getFileKey();
      if (!fileData) throw new Error("Key file atau cookie tidak tersedia.");
      format = format.toUpperCase();
      const url = `${this.baseUrl}/ConversionApi/Convert?outputType=${format}`;
      const form = new FormData();
      form.append(fileData.key, new Blob([html], {
        type: "text/html"
      }), `${name}.html`);
      form.append("UploadOptions", "HTML,MHTML");
      const {
        data
      } = await this.client.post(url, form, {
        headers: {
          accept: "*/*",
          origin: "https://products.sheetize.app",
          referer: "https://products.sheetize.app/id/conversion/html-to-image",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
          cookie: fileData.cookie
        }
      });
      if (!data?.FolderName) throw new Error("Konversi gagal atau data tidak valid.");
      return `${this.downloadUrl}/${data.FolderName}?file=${data.FileName}&password=${data.Password}`;
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
    const converter = new SheetizeConvert();
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