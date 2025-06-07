import axios from "axios";
class StockRhmdYouTube {
  constructor() {
    this.baseUrl = "https://www.stockrhmd.site/api/youtube/download";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.stockrhmd.site/youtube"
    };
  }
  async download(url, format = "1080") {
    try {
      const {
        data
      } = await axios.get(this.baseUrl, {
        params: {
          url: url,
          format: format
        },
        headers: this.headers
      });
      if (!data) throw new Error("Gagal mengambil data.");
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      format = "720"
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No YouTube URL"
    });
    const downloader = new StockRhmdYouTube();
    const result = await downloader.download(url, format);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}