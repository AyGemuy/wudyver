import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search(query) {
    try {
      const randomPage = Math.floor(Math.random() * 3) + 1;
      const link = encodeURIComponent(`https://www.xnxx.com/search/${encodeURIComponent(query)}/${randomPage}`);
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const videos = [];
      $("div.thumb-block").each((index, element) => {
        const video = {
          title: $(element).find(".thumb-under a").attr("title"),
          link: `https://www.xnxx.com${$(element).find(".thumb-under a").attr("href")}`,
          thumbnail: $(element).find(".thumb img").attr("src"),
          uploader: $(element).find(".uploader a span").text(),
          views: $(element).find(".metadata .right").text().trim().split(" ")[0],
          duration: $(element).find(".metadata").text().trim().split("\n")[1] || "N/A"
        };
        if (video.link && !video.link.includes("undefined")) {
          videos.push(video);
        }
      });
      return videos;
    } catch (error) {
      console.error("Error fetching data:", error.message || error);
      throw error;
    }
  }
  async detail(url) {
    try {
      const {
        data: html
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const title = $('meta[property="og:title"]').attr("content");
      const duration = $('meta[property="og:duration"]').attr("content") || "N/A";
      const image = $('meta[property="og:image"]').attr("content");
      const info = $("span.metadata").text().trim();
      const scriptContent = $("#video-player-bg > script:nth-child(6)").html();
      const files = {
        low: (scriptContent.match(/html5player\.setVideoUrlLow\('(.*?)'\);/) || [])[1],
        high: (scriptContent.match(/html5player\.setVideoUrlHigh\('(.*?)'\);/) || [])[1],
        hls: (scriptContent.match(/html5player\.setVideoHLS\('(.*?)'\);/) || [])[1],
        thumb: (scriptContent.match(/html5player\.setThumbUrl\('(.*?)'\);/) || [])[1],
        thumb_69: (scriptContent.match(/html5player\.setThumbUrl169\('(.*?)'\);/) || [])[1],
        slide: (scriptContent.match(/html5player\.setThumbSlide\('(.*?)'\);/) || [])[1],
        slide_big: (scriptContent.match(/html5player\.setThumbSlideBig\('(.*?)'\);/) || [])[1]
      };
      return {
        status: true,
        title: title,
        url: url,
        duration: duration,
        image: image,
        info: info,
        files: files
      };
    } catch (error) {
      console.error("Error fetching data:", error.message || error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new Downloader();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await downloader.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await downloader.detail(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}