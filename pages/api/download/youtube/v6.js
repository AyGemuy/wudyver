import axios from "axios";
class VideoDownloader {
  constructor() {
    this.apiKeys = ["4601f4fa84msh4d3ccc10e5945bbp1ada17jsna239b9ae3d0f", "0647bc5201msh84a9358b48d00eep163485jsne7ecf062e49f"];
  }
  getRandomApiKey() {
    const randomIndex = Math.floor(Math.random() * this.apiKeys.length);
    return this.apiKeys[randomIndex];
  }
  getId(url) {
    const match = url.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\/?\?v=|\/embed\/|\/)([^\s&\?\/\#]+)/);
    return match ? match[1] : null;
  }
  async youtube({
    url
  }) {
    const videoId = this.getId(url);
    if (!videoId) throw new Error("Invalid YouTube URL");
    console.log(`Starting download process for video ID: ${videoId}`);
    try {
      const apiKey = this.getRandomApiKey();
      console.log(`Using API Key: ${apiKey}`);
      const response = await axios.get(`https://ytstream-download-youtube-videos.p.rapidapi.com/dl`, {
        params: {
          id: videoId
        },
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "ytstream-download-youtube-videos.p.rapidapi.com",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
          referer: "https://www.ytaudiozone.online/?m=1"
        }
      });
      console.log("Response received:", response.data);
      if (response.data.message) {
        throw new Error(response.data.message);
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching download link:", error.message);
      return null;
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
    const data = await downloader.youtube(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}