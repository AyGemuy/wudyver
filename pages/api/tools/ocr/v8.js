import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import * as cheerio from "cheerio";
class ImageToTextOCR {
  constructor() {
    this.baseURL = "https://imagetotext.online";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://imagetotext.online",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://imagetotext.online/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.cookies = "";
    this.csrfToken = "";
  }
  async initSession() {
    try {
      const {
        data,
        headers
      } = await axios.get(this.baseURL, {
        headers: this.headers
      });
      this.cookies = headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
      this.csrfToken = cheerio.load(data)('meta[name="csrf-token"]').attr("content") || "";
      if (!this.csrfToken) throw new Error("CSRF Token tidak ditemukan!");
    } catch (error) {
      console.error("Gagal mengambil cookie dan token:", error.message);
    }
  }
  async ocr({
    url: imgUrl
  }) {
    try {
      if (!this.cookies || !this.csrfToken) await this.initSession();
      const {
        data: fileBuffer,
        headers
      } = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      const ext = headers["content-type"].split("/")[1];
      const form = new FormData();
      form.append("request[]", new Blob([fileBuffer], {
        type: headers["content-type"]
      }), `image.${ext}`);
      const {
        data: result
      } = await axios.post(`${this.baseURL}/save-Image`, form, {
        headers: {
          ...this.headers,
          "x-csrf-token": this.csrfToken,
          cookie: this.cookies,
          ...form.headers
        }
      });
      return result;
    } catch (error) {
      console.error("Gagal melakukan OCR:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const ocr = new ImageToTextOCR();
  try {
    const data = await ocr.ocr(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}