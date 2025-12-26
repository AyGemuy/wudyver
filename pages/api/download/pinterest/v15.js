import axios from "axios";
class PinterestDownloader {
  constructor() {
    this.client = axios.create();
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`Savetube: ${url}`);
      const {
        data
      } = await this.client.post("https://pinterest.savetube.me/api/v1/pinterest-video-downloader", {
        url: url
      }, {
        headers: {
          "User-Agent": this.ua,
          "Content-Type": "application/json",
          Cookie: "_ga=GA1.1.1969941979.1696263296; _ga_3Q4D9SLPKL=GS1.1.1696342106.2.1.1696344851.0.0.0",
          ...rest
        }
      });
      const result = data?.response?.data || {
        status: "failed"
      };
      console.log("[Proses] Request berhasil diselesaikan.");
      return result;
    } catch (err) {
      console.log(`Error: ${err?.message || "Unknown"}`);
      return {
        source: "savetube",
        success: false,
        error: err?.message || "Gagal"
      };
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
  const api = new PinterestDownloader();
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