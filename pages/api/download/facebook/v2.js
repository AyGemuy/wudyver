import axios from "axios";
import * as cheerio from "cheerio";
class VideoDownloader {
  constructor(pageUrl) {
    this.pageUrl = pageUrl;
  }
  async download({
    url: videoUrl
  }) {
    try {
      const response = await axios.get(this.pageUrl);
      const $ = cheerio.load(response.data);
      const token = $("#token").val();
      const postUrl = "https://getindevice.com/wp-json/aio-dl/video-data/";
      const data = new URLSearchParams();
      data.append("url", videoUrl);
      data.append("token", token);
      const postResponse = await axios.post(postUrl, data.toString(), {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://getindevice.com",
          referer: "https://getindevice.com/facebook-video-downloader/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("Response:", postResponse.data);
    } catch (error) {
      console.error("Error:", error);
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new VideoDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}