import axios from "axios";
class StockRhmd {
  constructor() {
    this.baseUrl = "https://www.stockrhmd.site/api/tiktok/download";
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.stockrhmd.site/tiktok"
    };
  }
  async download(url) {
    try {
      const {
        data
      } = await axios.post(this.baseUrl, {
        url: url
      }, {
        headers: this.headers
      });
      if (!data.status) throw new Error("Gagal mengambil data.");
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL tidak ditemukan. Pastikan URL TikTok sudah benar."
    });
  }
  const downloader = new StockRhmd();
  try {
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Terjadi kesalahan pada server, coba lagi nanti.",
      details: error.message
    });
  }
}