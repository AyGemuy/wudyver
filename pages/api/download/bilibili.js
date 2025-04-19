import axios from "axios";
import * as cheerio from "cheerio";
class BStation {
  constructor() {
    this.axiosInstance = axios.create();
    this.headers = {
      DNT: "1",
      Origin: "https://www.bilibili.tv",
      Referer: `https://www.bilibili.tv/video/`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0"
    };
  }
  async search(query, page = 1) {
    try {
      const res = await this.axiosInstance.get("https://api.bilibili.tv/intl/gateway/web/v2/search_v2", {
        params: {
          s_locale: "id_ID",
          platform: "web",
          keyword: query,
          highlight: 1,
          pn: page,
          ps: 20
        }
      });
      const data = res.data.data.modules?.[0]?.items?.map(item => ({
        title: item.title,
        url: `https://www.bilibili.tv/video/${item.aid}`,
        id: item.aid,
        author: item.author,
        thumbnail: item.cover,
        view: item.view,
        duration: item.duration
      })) || [];
      return data;
    } catch (error) {
      return {
        status: false,
        message: error.message || "Something went wrong"
      };
    }
  }
  async download(url, quality = "480P") {
    try {
      const aid = url.match(/video\/(\d+)/)?.[1];
      if (!aid) return {
        status: false,
        message: "ID Video not found"
      };
      const appInfo = await this.axiosInstance.get(url).then(res => res.data);
      const $ = cheerio.load(appInfo);
      const title = $("h1.bstar-meta__title").text().trim() || "Unknown Title";
      const metaTags = {};
      $("meta").each((_, elem) => {
        const name = $(elem).attr("name") || $(elem).attr("property");
        if (name) metaTags[name] = $(elem).attr("content") || "";
      });
      const response = await this.axiosInstance.get("https://api.bilibili.tv/intl/gateway/web/playurl", {
        params: {
          s_locale: "id_ID",
          platform: "web",
          aid: aid,
          qn: "64",
          type: "0",
          device: "wap",
          tf: "0",
          spm_id: "bstar-web.ugc-video-detail.0.0",
          from_spm_id: "bstar-web.homepage.trending.all",
          fnval: "16",
          fnver: "0"
        }
      }).then(res => res.data);
      const video = response.data?.playurl?.video?.map(item => ({
        quality: item.stream_info.desc_words.toLowerCase(),
        codecs: item.video_resource.codecs,
        size: item.video_resource.size,
        mime: item.video_resource.mime_type,
        url: item.video_resource.url || item.video_resource.backup_url?.[0] || ""
      }))?.filter(item => item.url) || [];
      const audio = response.data?.playurl?.audio_resource?.map(item => ({
        size: item.size,
        url: item.url || item.backup_url?.[0] || ""
      }))?.filter(item => item.url) || [];
      const filteredVideo = quality ? video.filter(v => v.quality === quality.toLowerCase()) : video;
      if (filteredVideo.length === 0) throw new Error("No video found for the specified quality");
      return {
        title: title,
        locate: metaTags["og:locale"] || "Unknown Locale",
        description: metaTags["description"] || "No Description",
        type: metaTags["og:video:type"] || "Unknown Type",
        cover: metaTags["og:image"] || "",
        views: $(".bstar-meta__tips-left .bstar-meta-text").first().text().trim() || "0",
        like: $(".interactive__btn.interactive__like").text().trim() || "0",
        comments: $(".interactive__btn.interactive__comments").text().trim() || "0",
        favorites: $(".interactive__btn.interactive__fav").text().trim() || "0",
        downloads: $(".interactive__btn.interactive__download").text().trim() || "0",
        media: {
          video: filteredVideo,
          audio: audio
        }
      };
    } catch (error) {
      return {
        status: false,
        message: error.message || "Something went wrong"
      };
    }
  }
  async getVideo(url) {
    try {
      let buffers = [];
      let start = 0;
      let end = 5 * 1024 * 1024;
      let fileSize = 0;
      while (true) {
        const range = `bytes=${start}-${end}`;
        const response = await this.axiosInstance.get(url, {
          headers: {
            ...this.headers,
            Range: range
          },
          responseType: "arraybuffer"
        });
        if (fileSize === 0) {
          const contentRange = response.headers["content-range"];
          if (contentRange) {
            fileSize = parseInt(contentRange.split("/")[1]);
          }
        }
        buffers.push(Buffer.from(response.data));
        if (end >= fileSize - 1) {
          break;
        }
        start = end + 1;
        end = Math.min(start + 5 * 1024 * 1024 - 1, fileSize - 1);
      }
      const finalBuffer = Buffer.concat(buffers);
      return finalBuffer;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    action,
    query,
    quality
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      message: "No action provided"
    });
  }
  const videoDownloader = new BStation();
  try {
    let result;
    switch (action) {
      case "download":
        if (!url) {
          return res.status(400).json({
            message: "No url provided for download"
          });
        }
        result = await videoDownloader.download(url, quality);
        return res.status(200).json({
          result: result
        });
      case "search":
        if (!query) {
          return res.status(400).json({
            message: "No query provided for search"
          });
        }
        result = await videoDownloader.search(query);
        return res.status(200).json({
          result: result
        });
      case "getVideo":
        if (!url) {
          return res.status(400).json({
            message: "No url provided for getVideo"
          });
        }
        const videoBuffer = await videoDownloader.getVideo(url);
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Length", videoBuffer.length);
        return res.status(200).send(videoBuffer);
      default:
        return res.status(400).json({
          message: "Invalid action"
        });
    }
  } catch (error) {
    console.error("Error during media processing:", error);
    return res.status(500).json({
      message: "Error during media processing",
      error: error.message
    });
  }
}