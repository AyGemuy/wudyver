import axios from "axios";
class TikTokDownloader {
  constructor() {
    this.baseUrl = "https://tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com/vid/index";
    this.headers = {
      "X-RapidAPI-Key": "6358a81965mshdcdb8e5e97f7c67p1de9f7jsnc7c9128fa3bd",
      "X-RapidAPI-Host": "tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://snaptiktok.site/"
    };
  }
  async download(url) {
    try {
      const {
        data
      } = await axios.get(this.baseUrl, {
        params: {
          url: url
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
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const downloader = new TikTokDownloader();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}