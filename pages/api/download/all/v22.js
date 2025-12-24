import axios from "axios";
class MagicDownloader {
  async download({
    url
  }) {
    try {
      console.log(`Memproses URL: ${url}`);
      const response = await axios.post("https://python-magicslides-tools-api.onrender.com/extract_info", JSON.stringify(url), {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
          Referer: "https://www.sheetai.app/id/tools/tiktok-video-downloader"
        },
        decompress: true
      });
      console.log("Request berhasil dengan status:", response.status);
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan:", error.message);
      throw new Error(`Download gagal: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new MagicDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}