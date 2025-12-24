import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookieJarSupport
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class HtmlToImageGenerator {
  constructor() {
    console.log("Proses: Inisialisasi HttpToImageConverter");
    const cookieJar = new CookieJar();
    this.axiosInstance = axios.create({
      jar: cookieJar,
      withCredentials: true
    });
    axiosCookieJarSupport(this.axiosInstance);
  }
  async gT() {
    try {
      console.log("Proses: Mengambil token CSRF");
      const response = await this.axiosInstance.get("https://htmlcsstoimage.com/");
      const $ = cheerio.load(response.data);
      const token = $('input[name="__RequestVerificationToken"]').val();
      console.log(token ? "Proses: Token ditemukan" : "Proses: Gagal menemukan token");
      return token || null;
    } catch (error) {
      console.error("Error saat mengambil token:", error.message);
      return null;
    }
  }
  async convertHTMLToImage({
    html,
    width = 1280,
    height = 1280,
    ...rest
  }) {
    console.log("Proses: Memulai konversi HTML ke gambar");
    try {
      const token = await this.gT();
      if (!token) {
        throw new Error("Tidak bisa melanjutkan tanpa token CSRF");
      }
      const defaultPayload = {
        full_screen: true,
        render_when_ready: false,
        color_scheme: "light",
        timezone: "UTC",
        block_consent_banners: false
      };
      const payload = {
        ...defaultPayload,
        html: html,
        viewport_width: width,
        viewport_height: height,
        ...rest,
        __RequestVerificationToken: token
      };
      const headers = {
        accept: "*/*",
        "content-type": "application/json",
        origin: "https://htmlcsstoimage.com",
        referer: "https://htmlcsstoimage.com/",
        requestverificationtoken: token,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
      console.log("Proses: Mengirim permintaan POST dengan payload final:", payload);
      const response = await this.axiosInstance.post("https://htmlcsstoimage.com/image-demo", payload, {
        headers: headers
      });
      const imageUrl = response?.data?.url;
      console.log("Proses: Berhasil mendapatkan URL gambar");
      return imageUrl ? imageUrl : "URL tidak ditemukan";
    } catch (error) {
      console.error("Error saat konversi HTML:", error.message);
      const errorMessage = error?.response?.data?.title || error?.response?.data || "Terjadi kesalahan tidak diketahui";
      return {
        error: errorMessage
      };
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
    const converter = new HtmlToImageGenerator();
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