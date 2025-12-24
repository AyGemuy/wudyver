import axios from "axios";
class StockRhmdSpotify {
  constructor() {
    this.baseUrl = "https://www.stockrhmd.site/api/spotify/download";
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.stockrhmd.site/spotify"
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
      if (!data) throw new Error("Gagal mengambil data.");
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
      error: "Missing required query parameter: url"
    });
  }
  try {
    const downloader = new StockRhmdSpotify();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}