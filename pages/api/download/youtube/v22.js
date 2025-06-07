import axios from "axios";
class YouTubeDownloader {
  constructor(url, quality = "audio") {
    this.videoID = this.extractVideoId(url);
    this.quality = quality;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      cookie: "KYTDownloader=s%3A4aGqzNwdLZvr7_cyy2xOWP7V26d3N89T.c%2FZHc9JYTMvewAQamnDE2hOLax5e03zuB%2FqC3ClNqbc",
      origin: "https://ytdl.kinuseka.us",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://ytdl.kinuseka.us/video",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  extractVideoId(url) {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
  getQualityParams() {
    const qualities = {
      audio: {
        audioonly: true
      },
      "1080p": {
        itag: 137
      },
      "720p": {
        itag: 136
      },
      "480p": {
        itag: 135
      },
      "360p": {
        itag: 134
      },
      "240p": {
        itag: 133
      },
      "144p": {
        itag: 160
      }
    };
    return qualities[this.quality] || qualities.audio;
  }
  async fetchToken() {
    const params = new URLSearchParams({
      videoID: this.videoID,
      ...this.getQualityParams()
    }).toString();
    let token = null;
    const maxRetries = 10;
    const delay = 1e3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const response = await axios.post("https://ytdl.kinuseka.us/v_api/fetch_token", params, {
          headers: this.headers
        });
        token = response.data.token;
        console.log(`Attempt ${attempt + 1}: Token = ${token}`);
        if (token && token.startsWith("ey")) break;
      } catch (error) {
        console.log(`Attempt ${attempt + 1}: Failed to fetch token`);
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    if (!token || !token.startsWith("ey")) throw new Error("Failed to fetch a valid token after multiple attempts.");
    return token;
  }
  async getDownloadData() {
    const token = await this.fetchToken();
    return {
      result: `https://ytdl.kinuseka.us/video/dllink?sid=${token}`
    };
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      quality = "audio"
    } = req.method === "GET" ? req.query : req.body;
    const downloader = new YouTubeDownloader(url, quality);
    if (!downloader.videoID) return res.status(400).json({
      error: "Invalid YouTube URL"
    });
    const data = await downloader.getDownloadData();
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}