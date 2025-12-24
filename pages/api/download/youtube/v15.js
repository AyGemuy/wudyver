import fetch from "node-fetch";
import {
  FormData
} from "formdata-node";
const userAgentList = ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36", "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36"];
class YTDL {
  constructor() {
    this.userAgent = userAgentList[Math.floor(Math.random() * userAgentList.length)];
  }
  async fetchDescription(youtubeUrl) {
    const response = await fetch("https://contentforest.com/api/tools/youtube-video-data", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Content-Type": "application/json",
        Origin: "https://contentforest.com",
        Referer: "https://contentforest.com/tools/youtube-description-extractor",
        "User-Agent": this.userAgent
      },
      body: JSON.stringify({
        youtube_link: youtubeUrl,
        pick_keys: ["title", "description", "shortDescription"]
      })
    });
    const data = await response.json();
    return data.shortDescription.replace(/\n+/g, " ").trim();
  }
  async fetchVideoData(youtubeUrl) {
    try {
      const apiUrl = `https://p.oceansaver.in/ajax/download.php?copyright=0&format=1080&url=${encodeURIComponent(youtubeUrl)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`;
      const downloadRequest = await fetch(apiUrl, {
        headers: {
          "User-Agent": this.userAgent,
          referer: "https://ddownr.com/"
        }
      });
      const downloadData = await downloadRequest.json();
      if (!downloadData.success) throw new Error("Failed to initiate download.");
      const {
        id: videoId,
        info: {
          title: videoTitle,
          image: thumbnailUrl
        }
      } = downloadData;
      const progressPromise = new Promise((resolve, reject) => {
        let retries = 10;
        const interval = setInterval(async () => {
          const progressUrl = `https://p.oceansaver.in/ajax/progress.php?id=${videoId}`;
          const progressRequest = await fetch(progressUrl);
          const progressData = await progressRequest.json();
          if (progressData.success && progressData.progress >= 1e3) {
            clearInterval(interval);
            resolve(progressData.download_url);
          }
          if (--retries <= 0) {
            clearInterval(interval);
            reject(new Error("Failed to fetch download URL."));
          }
        }, 3e3);
      });
      const downloadUrl = await progressPromise;
      const downloadResponse = await fetch(downloadUrl);
      const videoBuffer = await downloadResponse.arrayBuffer();
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", videoBuffer, {
        filename: `${videoTitle.replace(/\s/g, "_")}.mp4`
      });
      const uploadResponse = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        headers: {
          "User-Agent": this.userAgent
        },
        body: formData
      });
      const uploadData = await uploadResponse.json();
      const description = await this.fetchDescription(youtubeUrl);
      return {
        title: videoTitle,
        thumbnail: thumbnailUrl,
        description: description,
        downloadUrl: uploadData
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing YouTube URL"
    });
  }
  try {
    const ytdl = new YTDL();
    const data = await ytdl.fetchVideoData(url);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}