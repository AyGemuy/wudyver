import axios from "axios";
class Downloader {
  constructor() {
    this.apiThreadsPhoto = "https://api.threadsphotodownloader.com/v2/media";
  }
  async download({
    url
  }) {
    try {
      const {
        data
      } = await axios.get(`${this.apiThreadsPhoto}?url=${encodeURIComponent(url)}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          origin: "https://sssthreads.pro",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://sssthreads.pro/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      return data || {
        error: "Failed to fetch from ThreadsPhotoDownloader"
      };
    } catch {
      return {
        error: "Failed to fetch from ThreadsPhotoDownloader"
      };
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