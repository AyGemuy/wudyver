import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar: jar
}));
class UrlShortener {
  constructor() {
    console.log("UrlShortener siap digunakan.");
    this.baseHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://spoo.me",
      referer: "https://spoo.me/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async short({
    url,
    name,
    ...rest
  }) {
    console.log("Proses pemendekan dimulai...");
    try {
      const alias = name || `${Math.random().toString(16).slice(2, 8)}`;
      console.log(`URL Asli: ${url}, Alias: ${alias}`);
      const postData = new URLSearchParams({
        url: url,
        alias: alias,
        password: "",
        "max-clicks": ""
      }).toString();
      console.log("Mengirim permintaan POST ke spoo.me...");
      const response = await client.post("https://spoo.me/", postData, {
        headers: this.baseHeaders
      });
      console.log("Permintaan berhasil, status:", response?.status || "Tidak ada status");
      const $ = cheerio.load(response.data);
      const shortUrl = $("#short-url")?.text()?.trim();
      const qrCodeUrl = $("#qrcode")?.attr("src");
      const result = shortUrl && qrCodeUrl ? {
        url: shortUrl,
        qr: qrCodeUrl
      } : null;
      if (result) {
        console.log("Hasil ditemukan:", result);
        return result;
      } else {
        console.log("URL pendek atau Kode QR tidak ditemukan dalam respons HTML.");
        return null;
      }
    } catch (error) {
      console.error("Terjadi kesalahan selama proses pemendekan:");
      console.error(`Pesan Error: ${error.message}`);
      console.error(`Status Code: ${error.response?.status || "N/A"}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const shortener = new UrlShortener();
    const response = await shortener.short(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}