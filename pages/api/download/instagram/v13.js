import axios from "axios";
import * as cheerio from "cheerio";
class InstagramDownloader {
  constructor() {
    this.baseUrl = "https://snapvid.net/api/ajaxSearch";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://snapvid.net/en/instagram-downloader"
    };
  }
  async searchVideo(url) {
    try {
      const data = new URLSearchParams({
        q: url,
        w: "",
        v: "v2",
        lang: "en",
        cftoken: ""
      }).toString();
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error searching for video:", error);
      throw new Error("Failed to search for video");
    }
  }
  async downloadVideo(url) {
    try {
      const searchResult = await this.searchVideo(url);
      if (searchResult.status !== "ok") {
        throw new Error("Video not found");
      }
      const {
        data
      } = searchResult;
      const $ = cheerio.load(data);
      const downloadLinks = [];
      $(".download-items").each((i, el) => {
        const videoLink = $(el).find(".download-items__btn a").attr("href");
        const thumbUrl = $(el).find(".download-items__thumb img").attr("src");
        if (videoLink && thumbUrl) {
          downloadLinks.push({
            link: videoLink,
            thumb: thumbUrl
          });
        }
      });
      if (downloadLinks.length === 0) {
        throw new Error("No download links found");
      }
      return downloadLinks;
    } catch (error) {
      console.error("Error during video download:", error);
      throw new Error("Failed to download video");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Invalid Instagram URL"
    });
  }
  try {
    const instagramDownloader = new InstagramDownloader();
    const downloadLinks = await instagramDownloader.downloadVideo(url);
    return res.status(200).json({
      result: downloadLinks
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}