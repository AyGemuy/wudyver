import axios from "axios";
import * as cheerio from "cheerio";
class IgDL {
  constructor() {
    this.apiUrl = "https://api.downloadgram.org/media";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://downloadgram.org",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://downloadgram.org/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchMedia({
    url,
    version = "3",
    language = "en"
  } = {}) {
    try {
      const postData = new URLSearchParams({
        url: url,
        v: version,
        lang: language
      });
      const {
        data
      } = await axios.post(this.apiUrl, postData, {
        headers: this.headers
      });
      return this.parseRes(data);
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
  parseRes(data) {
    try {
      const htmlContent = data.match(/innerHTML ="(.+?)";downloadMore\(\)/)?.[1] || "";
      if (!htmlContent) throw new Error("Format respons tidak dikenali");
      const $ = cheerio.load(htmlContent.replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n").replace(/\\t/g, "\t"));
      const media = [];
      $("video source").each((_idx, el) => {
        const videoUrl = this.cleanUrl($(el).attr("src"));
        const poster = this.cleanUrl($("video").attr("poster"));
        if (videoUrl) media.push({
          type: "video",
          url: videoUrl,
          poster: poster
        });
      });
      const downloadItems = $("a[download]").map((_idx, el) => {
        const url = this.cleanUrl($(el).attr("href"));
        return url ? {
          type: "download",
          url: url,
          filename: this.getFilenameFromUrl(url)
        } : null;
      }).get();
      media.push(...downloadItems.filter(Boolean));
      $("img").each((_idx, el) => {
        const url = this.cleanUrl($(el).attr("src"));
        if (url?.includes("cdn.downloadgram.org")) {
          media.push({
            type: "image",
            url: url
          });
        }
      });
      return {
        success: true,
        media: media
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rawResponse: data
      };
    }
  }
  cleanUrl(url) {
    return url?.replace(/^["'\\]+|["'\\]+$/g, "").replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\u002F/g, "/").trim() || null;
  }
  getFilenameFromUrl(url) {
    try {
      const token = url?.match(/token=([^&]+)/)?.[1];
      return token ? JSON.parse(atob(token.split(".")[1])).filename || "download" : "download";
    } catch {
      return "download";
    }
  }
  isValidUrl(url) {
    return /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_-]+/.test(url || "");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    message: "No url provided"
  });
  const igdl = new IgDL();
  try {
    const result = await igdl.fetchMedia(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({
      message: "Error during media download",
      error: error.message
    });
  }
}