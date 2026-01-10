import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import qs from "qs";
class InstaSave {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://instasave.website",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://instasave.website/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.apiBase = "https://api.instasave.website";
  }
  async req(endpoint, url) {
    try {
      const payload = qs.stringify({
        url: url,
        lang: "en"
      });
      const {
        data
      } = await this.client.post(`${this.apiBase}/${endpoint}`, payload, {
        headers: this.headers
      });
      return data || null;
    } catch (e) {
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log(`[InstaSave] Processing: ${url}`);
      const rawDp = await this.req("dp", url);
      const rawMedia = await this.req("media", url);
      const rawStory = await this.req("story", url);
      const parsedDp = this.parseRawResponse(rawDp, "avatar");
      const parsedMedia = this.parseRawResponse(rawMedia, "post");
      const parsedStory = this.parseRawResponse(rawStory, "story");
      const allResults = [...parsedDp, ...parsedMedia, ...parsedStory];
      const uniqueResults = allResults.filter((value, index, self) => index === self.findIndex(t => t.url === value.url));
      console.log(`[InstaSave] Berhasil: ${uniqueResults.length} media.`);
      return {
        status: uniqueResults.length > 0,
        result: uniqueResults
      };
    } catch (error) {
      console.error(`[InstaSave] Error: ${error.message}`);
      return {
        status: false,
        result: []
      };
    }
  }
  parseRawResponse(rawJsString, defaultType) {
    if (!rawJsString || typeof rawJsString !== "string") return [];
    const match = rawJsString.match(/innerHTML\s*=\s*"(.*?)";/);
    if (!match || !match[1]) return [];
    const cleanHtml = match[1].replace(/\\"/g, '"').replace(/\\n/g, "");
    const $ = cheerio.load(cleanHtml);
    const items = [];
    $(".download-items").each((i, el) => {
      const $el = $(el);
      const thumb = $el.find("img").attr("src");
      const link = $el.find("a").attr("href");
      if (!link) return;
      let type = "image";
      if ($el.find(".icon-ivideo").length > 0) {
        type = "video";
      } else if ($el.find(".icon-iphoto").length > 0) {
        type = "image";
      } else if (defaultType === "story" && link.includes(".mp4")) {
        type = "video";
      }
      if (defaultType === "avatar") type = "avatar";
      items.push({
        type: type,
        url: link,
        thumbnail: thumb || ""
      });
    });
    return items;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new InstaSave();
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