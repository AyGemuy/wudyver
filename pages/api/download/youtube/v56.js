import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class EasyTubeDownloader {
  constructor() {
    this.baseUrl = "https://easytube.pro";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=1, i",
      "x-requested-with": "XMLHttpRequest",
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.client.interceptors.request.use(req => {
      console.log(`[REQ] ${req.method?.toUpperCase()} ${req.url}`);
      if (req.data) console.log("[REQ DATA]", req.data.toString());
      return req;
    }, err => Promise.reject(err));
    this.client.interceptors.response.use(res => {
      console.log(`[RES] ${res.status} ${res.config.url}`);
      return res;
    }, err => {
      console.error("[ERR]", err.message);
      return Promise.reject(err);
    });
  }
  extractVideoId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|(?:embed|v)\/))([^?\s&"'>]+)/);
    return match ? match[1] : url;
  }
  async search({
    query = ""
  } = {}) {
    try {
      console.log(`[Search] "${query}"`);
      const res = await this.client.post(`${this.baseUrl}/search`, new URLSearchParams({
        q: query
      }), {
        headers: {
          ...this.headers,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
      });
      const $ = cheerio.load(res.data);
      return $(".converter-results__card").map((_, el) => {
        const $el = $(el);
        const title = $el.find(".converter-results__card-title").text().trim();
        const thumb = $el.find("img").attr("src");
        const videoId = $el.find("button[data-video-id]").attr("data-video-id");
        const formats = $el.find("table tbody tr").map((_, tr) => {
          const $tr = $(tr);
          const quality = $tr.find("td").eq(0).text().trim();
          const formatId = $tr.attr("id")?.replace(`tr_${videoId}_`, "");
          return {
            quality: quality,
            format: formatId
          };
        }).get();
        return {
          title: title,
          thumb: thumb,
          videoId: videoId,
          formats: formats
        };
      }).get();
    } catch (e) {
      console.error("[Search] Error:", e.message);
      throw e;
    }
  }
  async download({
    url,
    format = "mp4",
    quality = "240p"
  }) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) throw new Error("Invalid YouTube URL");
      const finalFormat = format === "mp3" && !quality ? "mp3" : `${format}_${quality}`;
      const rowSelector = `#tr_${videoId}_${finalFormat}`;
      const anchorSelector = `#dl_${videoId}_${finalFormat} a`;
      let attempts = 0;
      let downloadLink = null;
      let html = "",
        size = null,
        title = null;
      console.log(`[Download] Preparing ${finalFormat} for ${videoId}`);
      while (!downloadLink && attempts < 60) {
        const res = await this.client.post(`${this.baseUrl}/download`, new URLSearchParams({
          id: videoId,
          format: finalFormat
        }), {
          headers: this.headers
        });
        html = res.data;
        const $ = cheerio.load(html);
        downloadLink = $(anchorSelector).attr("href");
        if (downloadLink) {
          const $row = $(rowSelector);
          size = $row.find("td").eq(1).text().trim();
          title = $("title").text().trim();
          console.log(`[Download] Link Ready: ${downloadLink}`);
        } else {
          console.log(`[Polling] Waiting... (${++attempts})`);
          await this.sleep(3e3);
        }
      }
      return {
        status: downloadLink ? "ready" : "timeout",
        url: downloadLink,
        format: finalFormat,
        size: size,
        title: title,
        html: html
      };
    } catch (e) {
      console.error("[Download] Error:", e.message);
      throw e;
    }
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const input = req.method === "GET" ? req.query : req.body;
  const action = input.action || "download";
  const params = {
    ...input
  };
  try {
    const downloader = new EasyTubeDownloader();
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await downloader.search({
          query: params.query
        });
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await downloader.download({
          url: params.url,
          format: params.format || "mp4",
          quality: params.quality || "240p"
        });
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | download`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}