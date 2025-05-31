import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class MediafireDownloader {
  constructor(url) {
    this.url = url;
    this.apiBase = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=`;
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
  }
  async fetchPage(url) {
    try {
      const response = await axios.get(this.apiBase + url, {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      return cheerio.load(response.data);
    } catch (error) {
      console.error("Error fetching page:", error);
      throw new Error("Failed to fetch page");
    }
  }
  async getMediaInfo($) {
    const downloadUrl = ($("#downloadButton").attr("href") || "").trim();
    const repairUrl = ($("#download_link .retry").attr("href") || "").trim();
    const $intro = $("div.dl-info > div.intro");
    const filename = $intro.find("div.filename").text().trim();
    const filetype = $intro.find("div.filetype > span").eq(0).text().trim();
    const ext = /\(\.(.*?)\)/.exec($intro.find("div.filetype > span").eq(1).text())?.[1]?.trim() || "bin";
    const uploaded = $("div.dl-info > ul.details > li").eq(1).find("span").text().trim();
    const filesize = $("div.dl-info > ul.details > li").eq(0).find("span").text().trim();
    return {
      link: downloadUrl || repairUrl || "",
      repairUrl: repairUrl || "",
      name: filename || "",
      filetype: filetype || "",
      mime: ext || "bin",
      uploaded: uploaded || "",
      size: filesize || ""
    };
  }
  async downloadMedia(downloadUrl) {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
        }
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Error downloading media:", error);
      throw new Error("Failed to download media");
    }
  }
  async download(type = "info", url = this.url) {
    try {
      const $ = await this.fetchPage(url);
      const mediaInfo = await this.getMediaInfo($);
      switch (type) {
        case "get":
          if (mediaInfo.link) {
            const media = await this.downloadMedia(mediaInfo.link);
            return {
              ...mediaInfo,
              media: media
            };
          }
          return mediaInfo;
        case "info":
        default:
          return mediaInfo;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      throw new Error("Error fetching data from MediaFire");
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    action = "info"
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const downloader = new MediafireDownloader(url);
  try {
    const result = await downloader.download(action, url);
    switch (action) {
      case "info":
        return res.status(200).json(result);
      case "get":
        if (result.media) {
          res.setHeader("Content-Type", result.filetype);
          return res.status(200).send(result.media);
        }
        return res.status(404).json({
          message: "Media not found"
        });
      default:
        return res.status(400).json({
          message: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}