import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SavePinMedia {
  constructor() {
    this.base = "https://savepinmedia.com";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 3e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://savepinmedia.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
  }
  log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
  }
  _parse(html) {
    const $ = cheerio.load(html);
    const meta = $(".load-flex").map((i, el) => {
      const $el = $(el);
      const $auth = $el.find(".author");
      return {
        thumb: $el.find(".load-screenshot img").eq(0).attr("src") || "",
        author_name: $auth.find(".info a").text().trim(),
        author_url: $auth.find(".info a").attr("href"),
        avatar: $auth.find(".photo img").attr("src")
      };
    }).get()[0] || {};
    const files = $(".button-download a").map((i, el) => {
      const $link = $(el);
      const rawHref = $link.attr("href");
      const fullUrl = rawHref ? rawHref.startsWith("http") ? rawHref : this.base + rawHref : "";
      const typeText = $link.find(".type").text().trim();
      return {
        type: typeText.includes("MP4") ? "video" : "image",
        quality: typeText.replace(/\s+/g, " "),
        url: fullUrl,
        is_video: $link.find(".fa-file-video-o").length > 0
      };
    }).get();
    return {
      meta: meta,
      files: files
    };
  }
  async download({
    url
  }) {
    try {
      this.log(`Processing: ${url}`);
      const {
        data
      } = await this.client.get(`${this.base}/php/api/api.php`, {
        params: {
          url: url
        }
      });
      this.log("Parsing result...");
      const res = this._parse(data);
      if (!res.files.length) {
        throw new Error("Media links not found");
      }
      this.log(`Done. Found ${res.files.length} files.`);
      return {
        status: true,
        result: res
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        status: false,
        msg: e.message
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
  const api = new SavePinMedia();
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