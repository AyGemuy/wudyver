import axios from "axios";
class YtMp3 {
  constructor() {
    this.backend = ".ymcdn.org";
    this.format = "mp3";
    this.headers = {
      accept: "*/*",
      "user-agent": "Postify/1.0.0",
      origin: "https://ytmp3.mobi",
      referer: "https://ytmp3.mobi/"
    };
  }
  async request(url, params = {}) {
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        params: params
      });
      return data;
    } catch (error) {
      console.error(error.message);
      throw new Error("Request gagal.");
    }
  }
  async convert(url, format = this.format) {
    try {
      if (!url) throw new Error("Linknya mana? 🗿");
      if (!["mp3", "mp4"].includes(format)) throw new Error("Format tidak valid!");
      const videoId = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (!videoId) throw new Error("Link YouTube tidak valid!");
      const init = await this.request(`https://d${this.backend}/api/v1/init`, {
        p: "y",
        23: "1llum1n471",
        _: Math.random()
      });
      if (init.error) throw new Error(init.error);
      const response = await this.request(init.convertURL, {
        v: videoId,
        f: format,
        _: Math.random()
      });
      if (response.error) throw new Error(response.error);
      let progress;
      do {
        progress = await this.request(response.progressURL);
        console.log(`🚀 Progress: ${progress.progress}, 🔺 Percent: ${progress.percent}`);
        if (progress.error) throw new Error(progress.error);
        if (progress.progress < 3) await new Promise(resolve => setTimeout(resolve, 1e3));
      } while (progress.progress < 3);
      const {
        directLink,
        fileSize
      } = await this.redirect(response.downloadURL);
      return {
        title: progress.title,
        fileSize: fileSize,
        format: format,
        videoId: videoId,
        videoUrl: url,
        downloads: response.downloadURL,
        directLink: directLink
      };
    } catch (error) {
      console.error(error.message);
      return {
        error: error.message,
        videoUrl: url,
        format: format
      };
    }
  }
  async redirect(url) {
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      const directLink = response.status === 302 ? response.headers.location : url;
      const fileSize = await this.checkSize(directLink);
      return {
        directLink: directLink,
        fileSize: fileSize
      };
    } catch (error) {
      console.error(error.message);
      return {
        directLink: null,
        fileSize: "Unknown"
      };
    }
  }
  async checkSize(url) {
    try {
      const {
        headers,
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          Range: "bytes=0-1000000"
        },
        responseType: "arraybuffer"
      });
      let totalSize = parseInt(headers["content-range"]?.match(/\/(\d+)/)?.[1], 10);
      if (!totalSize) totalSize = data.byteLength * 100;
      return this.formatFileSize(totalSize);
    } catch (error) {
      console.error(error.message);
      return "Unknown";
    }
  }
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      format
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "Invalid YouTube URL"
    });
    const ytConverter = new YtMp3();
    const result = await ytConverter.convert(url, format);
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