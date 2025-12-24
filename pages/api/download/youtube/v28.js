import axios from "axios";
class YouTubeDownloader {
  constructor() {
    this.baseURL = "https://p.oceansaver.in";
  }
  async downloadVideo(link, format = "360") {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/ajax/download.php?copyright=0&format=${format}&url=${encodeURIComponent(link)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`);
      console.log("Download data:", data);
      if (data.success) {
        let progress = 0;
        while (progress < 1e3) {
          const {
            data: progressData
          } = await axios.get(`${this.baseURL}/ajax/progress.php?id=${data.id}`);
          console.log("Progress:", progressData);
          if (progressData.progress === 1e3) return progressData;
          progress = progressData.progress || progress;
          await this.delay(1e3);
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const {
    url,
    format = "360"
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "Invalid YouTube URL"
  });
  try {
    const downloader = new YouTubeDownloader();
    const result = await downloader.downloadVideo(url, format);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}