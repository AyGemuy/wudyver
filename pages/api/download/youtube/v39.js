import axios from "axios";
class YTDownloader {
  constructor() {
    this.baseUrl = "https://yt-cw.fabdl.com/youtube/get";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://en.listentoyoutube.ch",
      priority: "u=1, i",
      referer: "https://en.listentoyoutube.ch/",
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
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          url: url,
          mp3_task: 2
        },
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return null;
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
    const downloader = new YTDownloader();
    const result = await downloader.downloadVideo(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}