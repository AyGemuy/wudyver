import axios from "axios";
class Downloader {
  constructor() {
    this.baseURL = "https://infomama.xyz/api/down_options.php";
    this.headers = {
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://infomama.xyz/"
    };
  }
  async download(videoUrl) {
    try {
      const url = `${this.baseURL}?video=${encodeURIComponent(videoUrl)}`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      console.error("Error fetching download options:", error.message);
      return null;
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
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new Downloader();
    const result = await downloader.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}