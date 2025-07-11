import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class YouTubeDownloader {
  constructor() {
    this.url = "https://youtubedownloaderhd.xyz/result.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      cookie: "PHPSESSID=524444690efd94eca09183b2c34f534f",
      origin: "https://youtubedownloaderhd.xyz",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://youtubedownloaderhd.xyz/youtube-video-downloader",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async downloadVideo(link, hash = "pwx1ZmuipwZ0Zwt3AvZkZF0kZP01ZvZ1ZGZjBGH2Zmpk", type = "5") {
    const formData = new FormData();
    formData.append("codehap_link", link);
    formData.append("hash", hash);
    formData.append("type", type);
    this.headers["content-type"] = `multipart/form-data; boundary=${formData.boundary}`;
    try {
      const {
        data: html
      } = await axios.post(this.url, formData, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      return {
        title: $(".box .h2").text().trim() || "Unknown Title",
        author: $(".box .h5").text().trim() || "Unknown Author",
        thumbnail: $(".box img").attr("src") || "No Thumbnail",
        links: $(".yt_links .yt_link").map((_, el) => ({
          format: $(el).find(".format").text().trim() || "Unknown Format",
          quality: $(el).find(".small").first().text().trim() || "Unknown Quality",
          size: $(el).find(".small.my-2").text().trim() || "Unknown Size",
          url: $(el).attr("href") || "No URL"
        })).get()
      };
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "Invalid YouTube URL"
    });
    const downloader = new YouTubeDownloader();
    const data = await downloader.downloadVideo(url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}