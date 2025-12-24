import axios from "axios";
class Downloader {
  constructor(timeout = 3e4) {
    this.apiUrl = "https://api.threadsphotodownloader.com/v2/media";
    this.timeout = timeout;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://threadsvids.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://threadsvids.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url: threadsUrl
  }) {
    try {
      console.log(`🔍 Mengirim permintaan untuk: ${threadsUrl}`);
      const response = await axios.get(this.apiUrl, {
        params: {
          url: threadsUrl
        },
        headers: this.headers,
        timeout: this.timeout
      });
      console.log("✅ Permintaan berhasil, data diterima.");
      return response.data;
    } catch (error) {
      console.error("💥 Terjadi kesalahan saat melakukan permintaan:", error.message);
      if (error.response) {
        console.error("Detail Error:", error.response.data);
      }
      return null;
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
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}