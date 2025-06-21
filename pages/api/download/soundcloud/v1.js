import axios from "axios";
class SoundCloudDownloader {
  constructor() {
    this.baseUrl = "https://api.downloadsound.cloud/track";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Content-Type": "application/json;charset=UTF-8",
      Origin: "https://downloadsound.cloud",
      Priority: "u=1, i",
      Referer: "https://downloadsound.cloud/",
      "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "Sec-CH-UA-Mobile": "?1",
      "Sec-CH-UA-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async downloadTrack(url) {
    try {
      const response = await axios.post(this.baseUrl, {
        url: url
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil data: ${error.response?.status} - ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}