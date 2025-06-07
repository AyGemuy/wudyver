import axios from "axios";
class VideoGrabber {
  constructor() {
    this.apiUrl = "https://www.videograbber.pro/api/youtube/parse";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.videograbber.pro",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.videograbber.pro/youtube",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async download(url) {
    const body = {
      url: url
    };
    try {
      const response = await axios.post(this.apiUrl, body, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching video data:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Invalid YouTube URL"
    });
  }
  const videoGrabber = new VideoGrabber();
  try {
    const data = await videoGrabber.download(url);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch video data"
    });
  }
}