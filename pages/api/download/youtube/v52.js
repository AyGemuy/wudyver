import axios from "axios";
class YouTubeDownloader {
  constructor() {
    this.baseUrl = "https://bloggerpemula.pythonanywhere.com/youtube/fetch";
  }
  extractVideoId(url) {
    const patterns = [/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*?v=([a-zA-Z0-9_-]+)/, /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/, /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]+)/, /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]+)/];
    for (let pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
  async download({
    url
  }) {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      console.error("Error: Could not extract video ID from the provided URL.");
      return null;
    }
    try {
      const response = await axios.post(this.baseUrl, {
        videoId: videoId
      }, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json",
          Origin: "https://bloggerpemula.pythonanywhere.com",
          Pragma: "no-cache",
          Referer: `https://bloggerpemula.pythonanywhere.com/youtube/video/${videoId}`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error downloading YouTube video information:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new YouTubeDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}