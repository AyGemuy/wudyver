import axios from "axios";
import * as cheerio from "cheerio";
class InDown {
  constructor() {
    this.baseUrl = "https://indown.io";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: this.baseUrl,
      priority: "u=0, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url
  }) {
    try {
      if (!url) {
        throw new Error("URL parameter is required");
      }
      const endpoint = this.determineEndpoint(url);
      const refererUrl = `${this.baseUrl}${endpoint}`;
      const {
        data: html,
        headers
      } = await axios.get(refererUrl, {
        headers: this.headers,
        withCredentials: true
      });
      const cookies = headers["set-cookie"].join("; ");
      const $ = cheerio.load(html);
      const _token = $('input[name="_token"]').val();
      const formData = new URLSearchParams();
      formData.append("referer", refererUrl);
      formData.append("locale", "id");
      formData.append("_token", _token);
      formData.append("link", url);
      formData.append("t", this.getUrlType(url));
      const {
        data: responseData
      } = await axios.post(`${this.baseUrl}/download`, formData, {
        headers: {
          ...this.headers,
          cookie: cookies,
          referer: refererUrl
        },
        withCredentials: true
      });
      return this.extractMedia(responseData);
    } catch (error) {
      console.error("Error on indown.io:", error);
      return {
        status: false,
        msg: error.message
      };
    }
  }
  determineEndpoint(url) {
    if (/\/stories\/[^/]+\/\d+/.test(url)) {
      return "/insta-stories-download/id";
    } else if (/\/(reels?\/[^/]+)/.test(url)) {
      return "/reels/id";
    } else if (/\/(p|tv)\/[^/]+/.test(url)) {
      return "/id";
    } else if (/\/highlights\/\d+/.test(url)) {
      return "/instagram-highlights-download/id";
    } else if (/\.(jpg|jpeg|png|mp4|mov)/i.test(url) || /scontent/.test(url)) {
      return "/photo/id";
    } else if (/\/\w+$/.test(url) && !url.includes("/p/") && !url.includes("/reel/")) {
      return "/insta-dp-viewer/id";
    } else {
      return "/id";
    }
  }
  getUrlType(url) {
    if (/\/stories\/[^/]+\/\d+/.test(url)) return "i";
    if (/\/(reels?\/[^/]+)/.test(url)) return "r";
    if (/\/(p|tv)\/[^/]+/.test(url)) return "p";
    if (/\/highlights\/\d+/.test(url)) return "h";
    return "p";
  }
  extractMedia(html) {
    const $ = cheerio.load(html);
    const result = [];
    $("#result .col-md-4").each((_, el) => {
      const container = $(el);
      const isVideo = container.find("video").length > 0;
      const type = isVideo ? "video" : "image";
      const preview = isVideo ? container.find("video").attr("poster") : container.find("img").attr("src");
      const media = [];
      container.find(".btn-group-vertical a").each((_, btn) => {
        media.push($(btn).attr("href"));
      });
      if (media.length > 0) {
        result.push({
          type: type,
          preview: preview,
          media: media
        });
      }
    });
    return result.length > 0 ? {
      status: true,
      result: result
    } : {
      status: false,
      msg: "No results found."
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    message: "No url provided"
  });
  const indown = new InDown();
  try {
    const result = await indown.download(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({
      message: "Error during media download",
      error: error.message
    });
  }
}