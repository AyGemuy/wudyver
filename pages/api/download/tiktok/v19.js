import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class TikDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
  }
  async req(url, data, head) {
    try {
      console.log(`[LOG] Requesting -> ${url}`);
      const res = await this.http.post(url, data, {
        headers: head || {}
      });
      return res?.data || null;
    } catch (err) {
      console.error(`[ERROR] Req failed: ${err.message}`);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[LOG] Starting process for: ${url}`);
      const target = url || "";
      const api = "https://tikdownloader.io/api/ajaxSearch";
      const headers = {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        referer: "https://tikdownloader.io/en",
        "user-agent": rest?.ua || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        "x-requested-with": "XMLHttpRequest",
        ...rest?.headers
      };
      const body = new URLSearchParams({
        q: target,
        lang: rest?.lang ? rest.lang : "en"
      }).toString();
      const res = await this.req(api, body, headers);
      if (!res || res?.status !== "ok") throw new Error(res?.msg || "Invalid Response");
      console.log("[LOG] Parsing HTML content...");
      const $ = cheerio.load(res?.data || "");
      const title = $("h3").eq(0).text()?.trim() || "No Title";
      const thumb = $(".thumbnail img").eq(0).attr("src") || null;
      const id = $("#TikTokId").val() || "N/A";
      const links = $(".dl-action p a").map((em, el) => {
        const $el = $(el);
        const label = $el.text()?.trim() || "Download";
        return {
          index: em,
          label: label,
          type: label.toLowerCase().includes("mp3") ? "audio" : "video",
          url: $el.attr("href") || "#"
        };
      }).get();
      console.log(`[LOG] Successfully extracted ${links.length} links.`);
      return {
        success: true,
        id: id,
        title: title,
        thumb: thumb,
        download: links
      };
    } catch (err) {
      console.error(`[FATAL] Error: ${err.message}`);
      return {
        success: false,
        message: err.message
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
  const api = new TikDownloader();
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