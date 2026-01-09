import * as cheerio from "cheerio";
import axios from "axios";
import crypto from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import qs from "qs";
class ReelsVideo {
  constructor() {
    this.jar = new CookieJar();
    this.uuid = crypto.randomUUID();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://reelsvideo.io",
      withCredentials: true,
      headers: {
        authority: "reelsvideo.io",
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://reelsvideo.io",
        referer: "https://reelsvideo.io/",
        "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "hx-current-url": "https://reelsvideo.io/",
        "hx-request": "true",
        "hx-target": "target",
        "hx-trigger": "main-form"
      }
    }));
    this.state = {
      tt: null,
      ts: null
    };
  }
  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    const color = type === "err" ? "[31m" : "[32m";
    console.log(`${color}[${time}] [ReelsVideo] ${msg}\x1b[0m`);
  }
  getPath(urlInput) {
    try {
      const u = new URL(urlInput);
      let path = u.pathname + u.search;
      if (!path.endsWith("/")) path += "/";
      return path;
    } catch (e) {
      return urlInput;
    }
  }
  parse(html) {
    const $ = cheerio.load(html);
    const err = $("#errorContainer").text().trim();
    if (err) throw new Error(err);
    const author = {
      username: $(".text-400-16-18").first().text().trim() || "Unknown",
      avatar: $("img.rounded-full").first().attr("src") || ""
    };
    const mediaList = [];
    $(".bg-white.relative.rounded-3xl").each((i, el) => {
      const card = $(el);
      const downloadBtn = card.find(".download_link");
      const mp3Btn = card.find(".mp3");
      const bgDiv = card.find(".bg-cover");
      if (downloadBtn.length > 0) {
        let thumbnail = bgDiv.attr("data-bg");
        if (!thumbnail) {
          const style = bgDiv.attr("style");
          thumbnail = style?.match(/url\((.*?)\)/)?.[1] || "";
        }
        mediaList.push({
          type: "video",
          url: downloadBtn.attr("href"),
          thumbnail: thumbnail,
          mp3Meta: mp3Btn.length ? {
            id: mp3Btn.attr("data-id"),
            video: mp3Btn.attr("href")
          } : null
        });
      }
    });
    return {
      author: author,
      media: mediaList
    };
  }
  async init() {
    try {
      this.log("Fetching tokens...");
      const {
        data
      } = await this.client.get("/", {
        headers: {
          "hx-request": undefined,
          "hx-trigger": undefined
        }
      });
      const $ = cheerio.load(data);
      const raw = $("#main-form").attr("data-include-vals");
      const tt = raw?.match(/tt:'([^']+)'/)?.[1];
      const ts = raw?.match(/ts:(\d+)/)?.[1];
      if (!tt || !ts) throw new Error("Token not found");
      this.state = {
        tt: tt,
        ts: ts
      };
    } catch (e) {
      this.log(`Init failed: ${e.message}`, "err");
      throw e;
    }
  }
  async cvtMp3(meta) {
    try {
      const payload = JSON.stringify({
        id: meta.id,
        video: meta.video
      });
      const b64 = Buffer.from(payload).toString("base64");
      const {
        headers
      } = await axios.post("https://r.ssstik.top/b/insta_mp3.sh", qs.stringify({
        url: b64
      }), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "hx-target": "insta_convert",
          "hx-trigger": "insta_convert",
          origin: "https://reelsvideo.io",
          referer: "https://reelsvideo.io/",
          "user-agent": this.client.defaults.headers["user-agent"]
        }
      });
      return headers["hx-redirect"] || null;
    } catch (e) {
      this.log(`MP3 conversion failed: ${e.message}`, "err");
      return null;
    }
  }
  async download({
    url,
    convert = true,
    locale = "en"
  }) {
    try {
      if (!this.state.tt) await this.init();
      const endpoint = this.getPath(url);
      this.log(`Endpoint: ${endpoint}`);
      const body = qs.stringify({
        id: url,
        locale: locale,
        tt: this.state.tt,
        ts: this.state.ts
      });
      const {
        data
      } = await this.client.post(endpoint, body);
      if (data?.includes("sssunhandled") || data?.includes("sssratelimit")) {
        throw new Error("Server returned internal error/ratelimit");
      }
      const res = this.parse(data);
      if (convert) {
        this.log(`Processing ${res.media.length} items sequentially for MP3...`);
        for (const item of res.media) {
          if (item.mp3Meta) {
            const audioUrl = await this.cvtMp3(item.mp3Meta);
            if (audioUrl) {
              item.audio = audioUrl;
            }
            delete item.mp3Meta;
          }
        }
      } else {
        for (const item of res.media) {
          delete item.mp3Meta;
        }
      }
      this.log(`Success. Retrieved ${res.media.length} items.`);
      return res;
    } catch (e) {
      this.log(e.message, "err");
      return {
        error: true,
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new ReelsVideo();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}