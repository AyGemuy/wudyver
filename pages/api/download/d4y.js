import axios from "axios";
const BASE_URL = "https://www.d4y.online/download_";
const PROVIDERS = ["youtube", "facebook", "instagram", "tiktok", "twitter", "vimeo", "dailymotion", "soundcloud", "twitch", "bandcamp", "pornhub", "telegram"];
class VideoDownloader {
  async download({
    url,
    provider = "youtube"
  }) {
    if (!PROVIDERS.includes(provider)) {
      console.log(`Invalid provider: ${provider}. Available: ${PROVIDERS.join(", ")}`);
      return {
        success: false,
        error: `Provider not supported. Available: ${PROVIDERS.join(", ")}`
      };
    }
    console.log(`Starting download from ${provider}: ${url}`);
    try {
      const {
        data
      } = await axios.post(BASE_URL + provider, new URLSearchParams({
        url: url
      }), {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      if (data.message === "Download started") {
        console.log(`Download started, task ID: ${data.task_id}`);
        return await this.pollTask(data.task_id);
      }
      console.log("Failed to start download");
      return {
        success: false,
        error: "Failed to start download"
      };
    } catch (error) {
      console.error("Download error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async pollTask(taskId) {
    console.log(`Checking progress for task ID: ${taskId}`);
    try {
      while (true) {
        await new Promise(res => setTimeout(res, 3e3));
        const {
          data
        } = await axios.get(BASE_URL + "progress", {
          params: {
            task_id: taskId
          }
        });
        for (const line of data.split("\n")) {
          if (line.startsWith("data:")) {
            const status = JSON.parse(line.slice(6));
            if (status.status === "complete") {
              const downloadUrl = `${BASE_URL}file/${encodeURIComponent(status.filename)}`;
              console.log(`Download complete: ${downloadUrl}`);
              return {
                success: true,
                url: downloadUrl
              };
            }
            console.log(`Progress: ${status.progress}%`);
          }
        }
      }
    } catch (error) {
      console.error("Progress error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const downloader = new VideoDownloader();
  try {
    const data = await downloader.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}