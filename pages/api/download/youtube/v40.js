import axios from "axios";
class YouTubeDownloader {
  constructor() {
    this.baseURL = "https://www.clipto.com";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://www.clipto.com",
      referer: "https://www.clipto.com/id/media-downloader/youtube-downloader",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.csrfToken = null;
  }
  async getCsrfToken() {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/api/csrf`, {
        headers: this.headers
      });
      this.csrfToken = data.csrfToken;
      console.log("✓ CSRF token obtained");
      return this.csrfToken;
    } catch (error) {
      console.log("✗ CSRF token failed:", error.message);
      throw error;
    }
  }
  async getVideoInfo(url) {
    try {
      if (!this.csrfToken) await this.getCsrfToken();
      const {
        data
      } = await axios.post(`${this.baseURL}/api/youtube`, {
        url: url
      }, {
        headers: {
          ...this.headers,
          cookie: `XSRF-TOKEN=${this.csrfToken}`
        }
      });
      console.log("✓ Video info retrieved:", data.title);
      return data;
    } catch (error) {
      console.log("✗ Video info failed:", error.message);
      throw error;
    }
  }
  async addVideoMergeTask(youtubeURL, height = 720) {
    try {
      if (!this.csrfToken) await this.getCsrfToken();
      const {
        data
      } = await axios.post(`${this.baseURL}/clipto-api/asrtask/addVideoMerge`, {
        youtubeURL: youtubeURL,
        height: height,
        isMobile: true
      }, {
        headers: {
          ...this.headers,
          cookie: `XSRF-TOKEN=${this.csrfToken};`
        }
      });
      console.log("✓ Merge task created:", data.data.taskID);
      return data;
    } catch (error) {
      console.log("✗ Merge task failed:", error.message);
      throw error;
    }
  }
  async getVideoMergeTask(taskIDs) {
    try {
      const {
        data
      } = await axios.post(`${this.baseURL}/clipto-api/asrtask/getVideoMerge`, {
        taskIDs: taskIDs
      }, {
        headers: {
          ...this.headers,
          cookie: `XSRF-TOKEN=${this.csrfToken};`
        }
      });
      return data;
    } catch (error) {
      console.log("✗ Task check failed:", error.message);
      throw error;
    }
  }
  async pollTaskUntilComplete(taskID) {
    try {
      console.log("⏳ Polling task...");
      let attempts = 0;
      while (true) {
        const result = await this.getVideoMergeTask([taskID]);
        if (result.data?.tasks?.[0]) {
          const task = result.data.tasks[0];
          if (task.status === 2 && task.videoMergeURL) {
            if (task.videoMergeURL.startsWith("//")) {
              task.videoMergeURL = `https:${task.videoMergeURL}`;
            }
            console.log("✓ Task completed");
            return task;
          }
        }
        attempts++;
        console.log(`⏳ Attempt ${attempts}...`);
        if (attempts > 30) throw new Error("Task timeout");
        await new Promise(resolve => setTimeout(resolve, 2e3));
      }
    } catch (error) {
      console.log("✗ Polling failed:", error.message);
      throw error;
    }
  }
  _extractResolution(formatString) {
    if (!formatString) return null;
    const match = formatString.toLowerCase().match(/(\d+)(?:p)?/);
    return match ? parseInt(match[1], 10) : null;
  }
  getQualityHeight(format, medias) {
    if (!medias) return null;
    const lowerCaseFormat = format.toLowerCase();
    const targetResolution = this._extractResolution(format);
    const media = medias.find(m => {
      if (m.label?.toLowerCase() === lowerCaseFormat || m.quality?.toLowerCase() === lowerCaseFormat) {
        return true;
      }
      if (targetResolution !== null) {
        const mediaResolution = this._extractResolution(m.label || m.quality);
        if (mediaResolution !== null && mediaResolution === targetResolution) {
          return true;
        }
      }
      return false;
    });
    return media?.height || null;
  }
  async download({
    url,
    format = "720p",
    ...rest
  }) {
    try {
      console.log(`🚀 Starting download: ${format}`);
      const videoInfo = await this.getVideoInfo(url);
      const height = this.getQualityHeight(format, videoInfo.medias);
      if (height === null) {
        const availableFormats = videoInfo.medias.filter(m => m.label).map(m => m.label);
        let errorMessage = `Format "${format}" tidak ditemukan.`;
        if (availableFormats.length > 0) {
          errorMessage += ` Format yang tersedia: ${availableFormats.join(", ")}`;
        } else {
          errorMessage += ` Tidak ada format yang tersedia untuk URL ini.`;
        }
        return {
          success: false,
          error: errorMessage,
          ...rest
        };
      }
      const mergeTask = await this.addVideoMergeTask(url, height);
      if (mergeTask.head.code !== 0) throw new Error(mergeTask.head.msg);
      const downloadUrl = await this.pollTaskUntilComplete(mergeTask.data.taskID);
      console.log("✅ Download ready");
      return {
        ...videoInfo,
        ...downloadUrl,
        ...rest
      };
    } catch (error) {
      console.log("❌ Download failed:", error.message);
      return {
        success: false,
        error: error.message,
        ...rest
      };
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