import axios from "axios";
class TikCdn {
  constructor() {
    this.baseUrl = "https://tikcdn.live/api/proxy";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://tikcdn.live/"
    };
  }
  async fetchData(url) {
    try {
      if (!url || typeof url !== "string") {
        throw new Error("URL tidak valid atau tidak disediakan.");
      }
      const response = await axios.get(this.baseUrl, {
        params: {
          url: url
        },
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL diperlukan."
      });
    }
    const tikCdn = new TikCdn();
    const data = await tikCdn.fetchData(url);
    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan.",
      error: err.message
    });
  }
}