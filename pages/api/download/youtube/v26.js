import axios from "axios";
class CNVConverter {
  constructor() {
    this.formats = {
      audio: 1,
      video: 0
    };
    this.audioQuality = {
      "320kbps": 0,
      "256kbps": 1,
      "128kbps": 4,
      "96kbps": 5
    };
    this.videoQuality = {
      "144p": 144,
      "360p": 360,
      "480p": 480,
      "720p": 720,
      "1080p": 1080
    };
    this.baseHeaders = {
      "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
      "Content-Type": "application/json",
      "accept-language": "id-ID",
      referer: "https://cnvmp3.com/",
      origin: "https://cnvmp3.com",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=4",
      te: "trailers"
    };
  }
  async getData(url) {
    try {
      const data = JSON.stringify({
        url: url
      });
      const response = await axios.post("https://cnvmp3.com/get_video_data.php", data, {
        headers: this.baseHeaders
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching video data: ${error.message}`);
    }
  }
  async convert(url, format = "video", quality = "360p") {
    try {
      const {
        title
      } = await this.getData(url);
      const formatValue = this.formats[format] || this.formats["video"];
      const qualityValue = format === "audio" ? this.audioQuality[quality] || this.audioQuality["128kbps"] : this.videoQuality[quality] || this.videoQuality["360p"];
      const data = JSON.stringify({
        url: url,
        quality: qualityValue,
        title: title,
        formatValue: formatValue
      });
      const response = await axios.post("https://cnvmp3.com/download_video.php", data, {
        headers: this.baseHeaders
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error converting media: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    format,
    quality
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "Invalid YouTube URL"
  });
  try {
    const cnv = new CNVConverter();
    const result = await cnv.convert(url, format, quality);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}