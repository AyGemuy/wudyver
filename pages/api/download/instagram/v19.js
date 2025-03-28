import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  async fetchMetaData(postUrl) {
    try {
      const response = await axios.get(postUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });
      const $ = cheerio.load(response.data);
      return {
        title: $('meta[property="og:title"]').attr("content") || "No Title",
        thumbnail: $('meta[property="og:image"]').attr("content") || null,
        description: $('meta[property="og:description"]').attr("content") || null,
        url: postUrl
      };
    } catch {
      return {
        title: "No Title",
        thumbnail: null,
        description: null,
        url: postUrl
      };
    }
  }
  async inDownloader(postUrl) {
    const url = "https://indownloader.app/request";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://indownloader.app/video-downloader"
    };
    const data = new URLSearchParams({
      link: postUrl,
      downloader: "video"
    });
    try {
      const response = await axios.post(url, data.toString(), {
        headers: headers
      });
      const $ = cheerio.load(response.data.html);
      const info = await this.fetchMetaData(postUrl);
      const media = $(".download-options a").map((i, el) => $(el).attr("href")).get().map(v => {
        const linkId = v.split("id=")[1];
        if (linkId?.startsWith("ey")) {
          try {
            const decodedUrl = JSON.parse(Buffer.from(linkId.split("&")[0], "base64").toString("utf-8"))?.url;
            return {
              url: decodedUrl
            };
          } catch {
            return {
              url: v
            };
          }
        } else {
          return {
            url: v
          };
        }
      }).filter((item, index, self) => index === self.findIndex(t => t.url === item.url));
      return {
        info: info,
        media: media
      };
    } catch {
      return {
        info: {},
        media: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const saveMedia = new Downloader();
  try {
    const result = await saveMedia.inDownloader(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({
      message: "Error during media download",
      error: error.message
    });
  }
}