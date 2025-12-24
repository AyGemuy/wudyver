import axios from "axios";
class YouTubeConverter {
  constructor() {
    this.baseUrl = "https://api.mp3youtube.cc/v2";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://conv.mp3youtube.cc",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://conv.mp3youtube.cc/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getKey() {
    try {
      const response = await axios.get("https://api.mp3youtube.cc/v2/sanity/key", {
        headers: this.headers
      });
      return response.data.key || null;
    } catch (error) {
      console.error("Error fetching API key:", error);
      throw new Error("Failed to fetch API key");
    }
  }
  async download({
    url,
    format = "mp4",
    audioBitrate = 128,
    videoQuality = 720,
    vCodec = "h264"
  }) {
    try {
      const key = await this.getKey();
      if (!key) throw new Error("API key not found");
      const data = new URLSearchParams({
        link: url,
        format: format,
        audioBitrate: audioBitrate,
        videoQuality: videoQuality,
        vCodec: vCodec
      }).toString();
      const response = await axios.post(`${this.baseUrl}/converter`, data, {
        headers: {
          ...this.headers,
          key: key
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error during download:", error.message);
      throw new Error("Failed to download video");
    }
  }
  async getVideoInfo(url) {
    try {
      const response = await axios.post(`${this.baseUrl}/getVideoInfo`, new URLSearchParams({
        link: url
      }).toString(), {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching video info:", error.message);
      throw new Error("Failed to fetch video information");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "Invalid YouTube URL"
    });
    const ytConverter = new YouTubeConverter();
    const videoInfo = await ytConverter.getVideoInfo(url);
    const videoDownload = await ytConverter.download({
      url: url,
      ...params
    });
    const result = {
      info: videoInfo,
      download: videoDownload
    };
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}