import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
  }
  async downloadTrack(url) {
    try {
      const response = await this.client.post("https://soundcloudsdownloader.com/wp-content/plugins/codehap_soundCloud/result.php", new URLSearchParams({
        input: url
      }), {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          origin: "https://soundcloudsdownloader.com",
          referer: "https://soundcloudsdownloader.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const artworkUrl = $("div.containerBOX .first-div img").attr("src");
        const mp3Url = $("div.containerBOX .second-div a.chbtn").attr("href");
        const data = {
          artworkUrl: artworkUrl,
          mp3Url: mp3Url,
          title: $("div.containerBOX .second-div .text-2xl").text(),
          mp3DownloadUrl: `https://soundcloudsdownloader.com/wp-content/plugins/codehap_soundCloud/download.php?title=${encodeURIComponent($("div.containerBOX .second-div .text-2xl").text())}&type=2&url=${encodeURIComponent(mp3Url)}`
        };
        return data;
      }
      throw new Error("Failed to fetch data");
    } catch (error) {
      console.error("Error:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}