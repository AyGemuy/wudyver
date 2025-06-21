import axios from "axios";
class ScribdDownloader {
  constructor() {
    this.baseUrl = "https://api.scribd-downloader.co/document/";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://scribd-downloader.co",
      priority: "u=1, i",
      referer: "https://scribd-downloader.co/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  parseId(url) {
    try {
      const match = url.match(/^https?:\/\/[^\s/]+scribd\.com\/(?:doc|document)\/(\d{2,})/i);
      return match ? match[1] : null;
    } catch (error) {
      throw new Error("Gagal mengekstrak ID dari URL.");
    }
  }
  async download({
    url
  }) {
    try {
      const id = this.parseId(url);
      if (!id) throw new Error("ID dokumen tidak ditemukan dalam URL.");
      const response = await axios.get(`${this.baseUrl}${id}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengunduh dokumen: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const scribd = new ScribdDownloader();
  try {
    const data = await scribd.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}