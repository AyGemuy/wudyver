import axios from "axios";
class TeraboxDownloader {
  constructor() {
    this.baseURL = "https://terabox-downloader.pro/api/terabox-download";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://terabox-downloader.pro",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://terabox-downloader.pro/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  _formatUrl(url) {
    const idMatch = url.match(/(?:\/s\/|\?surl=)([a-zA-Z0-9_-]+)/);
    let id = idMatch ? idMatch[1] : url.replace(/^(https?:\/\/(?:www\.)?(?:teraboxshare|terabox|1024terabox|nephobox|4funbox|mirrobox|momentscloud)\.com\/s\/|https?:\/\/(?:www\.)?(?:teraboxapp|terabox)\.com\/#\/s\/|https?:\/\/(?:www\.)?(?:terabox)\.com\/sharing\/link\?surl=)?([a-zA-Z0-9_-]+)(?:.*)?/i, "$2");
    if (!id.startsWith("1")) {
      id = "1" + id;
    }
    return `https://1024terabox.com/s/${id}`;
  }
  async download({
    url
  }) {
    try {
      const formattedUrl = this._formatUrl(url);
      console.log(`Mengirim permintaan untuk URL: ${formattedUrl}`);
      const response = await axios.post(this.baseURL, {
        url: formattedUrl
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mengunduh:", error.message);
      if (error.response) {
        console.error("Data respons:", error.response.data);
      }
      throw error;
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