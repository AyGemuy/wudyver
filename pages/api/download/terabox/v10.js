import axios from "axios";
import CryptoJS from "crypto-js";
class TeraboxDownloader {
  constructor() {
    this.url = "https://dailycheapdeals.com/api/video-downloader";
    this.headers = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://dailycheapdeals.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://dailycheapdeals.com/video-downloader",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  encryptLink(link) {
    const key = "website:dailycheapdeals.com";
    return CryptoJS.AES.encrypt(link, key).toString();
  }
  async download(link) {
    try {
      if (!link) {
        throw new Error("Paramenter 'link' tidak ditemukan di URL.");
      }
      const encryptedLink = this.encryptLink(link);
      const data = {
        link: encryptedLink
      };
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TeraboxDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}