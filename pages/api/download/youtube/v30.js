import axios from "axios";
import WebSocket from "ws";
class Mp3Downloader {
  constructor() {
    this.baseUrl = "https://cdn.mp3j.cc";
  }
  async search(query) {
    const data = new URLSearchParams({
      q: query,
      _ym_uid: "undefined"
    }).toString();
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://mp3j.cc",
      referer: "https://mp3j.cc/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    try {
      const response = await axios.post(`${this.baseUrl}/search`, data, {
        headers: headers
      });
      return response.data?.YoutubeVideo || null;
    } catch {
      throw new Error("Pencarian gagal. Coba lagi.");
    }
  }
  async download(videoId, title, {
    audio = true,
    video = false,
    quality = 128,
    extension = "mp3"
  } = {}) {
    const params = new URLSearchParams({
      id: videoId,
      title: title,
      audio: audio,
      video: video,
      quality: quality,
      extension: extension
    }).toString();
    const wsUrl = `${this.baseUrl}/youtube?${params}`;
    const ws = new WebSocket(wsUrl, {
      headers: {
        Upgrade: "websocket",
        Origin: "https://mp3j.cc",
        "Cache-Control": "no-cache",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    return new Promise((resolve, reject) => {
      let result = "";
      ws.on("message", data => {
        result += data.toString();
      });
      ws.on("error", err => {
        reject(new Error("WebSocket error: " + err.message));
      });
      ws.on("close", () => {
        try {
          const parsedData = JSON.parse(result);
          resolve(parsedData);
        } catch (err) {
          reject(new Error("Error parsing WebSocket stream: " + err.message));
        }
      });
    });
  }
  async youtube({
    query,
    audio = true,
    video = false,
    quality = 128,
    extension = "mp3"
  }) {
    const videoData = await this.search(query);
    if (videoData) {
      const {
        videoId,
        title
      } = videoData;
      const customParams = {
        audio: audio,
        video: video,
        quality: quality,
        extension: extension
      };
      let wsData;
      try {
        wsData = await this.download(videoId, title, customParams);
      } catch (error) {
        throw new Error("Download process failed: " + error.message);
      }
      while (wsData.type !== "finished") {
        console.log("Waiting for WebSocket to finish...");
        await new Promise(resolve => setTimeout(resolve, 1e3));
        wsData = await this.download(videoId, title, customParams);
      }
      const directLink = `${this.baseUrl}/dl-yt?file=${wsData.file}&title=${encodeURIComponent(wsData.downloadTitle)}`;
      return {
        direct: directLink,
        ws: wsData,
        search: videoData
      };
    }
    throw new Error("Tidak ada sumber video ditemukan.");
  }
}
export default async function handler(req, res) {
  const {
    url,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Invalid YouTube URL"
    });
  }
  try {
    const downloader = new Mp3Downloader();
    const result = await downloader.youtube({
      query: url,
      audio: params.audio || true,
      video: params.video || false,
      quality: params.quality || 128,
      extension: params.extension || "mp3"
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}