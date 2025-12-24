import axios from "axios";
class VideoDownloader {
  constructor() {
    this.url = "https://bff.listnr.tech/backend/user/getInfoYT";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://listnr.ai",
      priority: "u=1, i",
      referer: "https://listnr.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async downloadVideo(url) {
    const data = {
      url: url,
      platform: "youtube",
      type: "video"
    };
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching YouTube info:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No YouTube URL"
    });
    const downloader = new VideoDownloader();
    const result = await downloader.downloadVideo(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}