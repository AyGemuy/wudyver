import axios from "axios";
class YouTubeData {
  constructor(url) {
    this.url = url;
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://examup-ai-app-g7ebe.ondigitalocean.app",
      priority: "u=1, i",
      referer: "https://examup-ai-app-g7ebe.ondigitalocean.app/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-language": "en"
    };
  }
  async getVideoDetails() {
    try {
      const {
        data
      } = await axios.get(`https://api-dev.turinq.com/api/v1/ai-tools/yt/details?url=${encodeURIComponent(this.url)}`, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      console.error("Gagal mengambil detail video:", error.message);
      return null;
    }
  }
  async getTranscript(captionUrl) {
    try {
      const {
        data
      } = await axios.get(`https://api-dev.turinq.com/api/v1/ai-tools/yt/transcript?url=${encodeURIComponent(captionUrl)}`, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      console.error("Gagal mengambil transkrip:", error.message);
      return null;
    }
  }
  async fetchAll() {
    const videoDetails = await this.getVideoDetails();
    if (!videoDetails) return null;
    const captions = videoDetails.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    const transcriptUrl = captions?.[0]?.baseUrl;
    const transcript = transcriptUrl ? await this.getTranscript(transcriptUrl) : null;
    return {
      videoDetails: videoDetails.videoDetails,
      transcript: transcript?.text || []
    };
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const yt = new YouTubeData(url);
    const result = await yt.fetchAll();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}