import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class PictifyConverter {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar
    }));
    this.apiUrl = "https://api.pictify.io/image/public";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://pictify.io",
      priority: "u=1, i",
      referer: "https://pictify.io/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async convertHtmlToImageUrl({
    html,
    width = 1280,
    height = 1280,
    fileExtension = "png"
  }) {
    const payload = {
      html: html,
      width: width,
      height: height,
      fileExtension: fileExtension
    };
    try {
      console.log("Mengirim permintaan ke Pictify API...");
      const response = await this.client.post(this.apiUrl, payload, {
        headers: this.headers
      });
      const imageUrl = response.data?.image?.url;
      if (response.status === 200 && imageUrl) {
        console.log("URL gambar berhasil didapatkan!");
        return imageUrl;
      } else {
        throw new Error(`Gagal mendapatkan URL gambar. Respons tidak valid atau URL tidak ditemukan. Status: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        console.error(`Error dari server Pictify (Status: ${error.response.status}):`, error.response.data);
        throw new Error(`Error dari server Pictify: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error("Terjadi kesalahan: Tidak ada respons dari server Pictify.");
        throw new Error("Tidak ada respons dari server Pictify.");
      } else {
        throw error;
      }
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
    const pictify = new PictifyConverter();
    const result = await pictify.convertHtmlToImageUrl(params);
    return res.status(200).json({
      url: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}