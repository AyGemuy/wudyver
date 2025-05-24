import axios from "axios";
class DDownr {
  constructor() {
    this.formatAudio = ["mp3", "m4a", "webm", "acc", "flac", "opus", "ogg", "wav"];
    this.formatVideo = ["360", "480", "720", "1080", "1440", "4k"];
    this.apiKey = "dfcb6d76f2f6a9894gjkege8a4ab232222";
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
  }
  async download(url, format) {
    format = this.formatAudio.includes(format) || this.formatVideo.includes(format) ? format : "mp3";
    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}&api=${this.apiKey}`,
      headers: {
        "User-Agent": this.userAgent
      }
    };
    try {
      const response = await axios.request(config);
      if (response.data?.success) {
        const {
          id,
          title,
          info
        } = response.data;
        const downloadUrl = await this.cekProgress(id);
        return {
          id: id,
          image: info.image,
          title: title,
          downloadUrl: downloadUrl
        };
      } else {
        throw new Error("Gagal mengambil detail video.");
      }
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }
  async cekProgress(id) {
    const config = {
      method: "GET",
      url: `https://p.oceansaver.in/ajax/progress.php?id=${id}`,
      headers: {
        "User-Agent": this.userAgent
      }
    };
    try {
      while (true) {
        const response = await axios.request(config);
        if (response.data?.success && response.data.progress === 1e3) {
          return response.data.download_url;
        }
        await new Promise(resolve => setTimeout(resolve, 5e3));
      }
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    format = "mp3"
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL harus disediakan."
    });
  }
  const ddownr = new DDownr();
  try {
    const result = await ddownr.download(url, format);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}