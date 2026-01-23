import axios from "axios";
import * as cheerio from "cheerio";
class TikSave {
  constructor() {
    this.api = "https://tiksave.io/api/ajaxSearch";
    this.ua = "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)";
  }
  log(msg, err = false) {
    const time = new Date().toLocaleTimeString();
    console[err ? "error" : "log"](`[${time}] ${msg}`);
  }
  async req(body) {
    try {
      this.log("Fetching metadata...");
      const {
        data
      } = await axios.post(this.api, new URLSearchParams(body), {
        headers: {
          "User-Agent": this.ua,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept-Encoding": "gzip",
          Connection: "Keep-Alive"
        }
      });
      return data;
    } catch (e) {
      this.log(`Req Fail: ${e.message}`, true);
      return null;
    }
  }
  par(html) {
    const $ = cheerio.load(html || "");
    const rawThumb = $(".image-tik img").attr("src");
    const rawTitle = $(".content h3").text()?.trim();
    const cleanThumb = rawThumb ? new URL(rawThumb).href : null;
    return $(".dl-action a").map((em, el) => {
      const scope = $(el);
      const rawUrl = scope.attr("href");
      const label = scope.text()?.trim() || "Download";
      const isAudio = label.includes("MP3");
      const isHd = label.includes("HD");
      const cleanUrl = rawUrl ? new URL(rawUrl).href : null;
      return cleanUrl ? {
        index: em,
        type: isAudio ? "audio" : "video",
        quality: isHd ? "hd" : "sd",
        label: label,
        url: cleanUrl,
        thumbnail: cleanThumb,
        title: rawTitle || "No Title"
      } : null;
    }).get();
  }
  async download({
    url,
    ...rest
  }) {
    this.log(`Start: ${url}`);
    try {
      if (!url) throw new Error("URL required");
      const res = await this.req({
        q: url
      });
      const status = res?.status;
      const htmlData = res?.data;
      if (status !== "ok" || !htmlData) throw new Error("API Error or Video Not Found");
      const result = this.par(htmlData);
      this.log(`Success. Found ${result.length} download options.`);
      return {
        source: url,
        total: result.length,
        result: result
      };
    } catch (e) {
      this.log(e.message, true);
      return {
        result: []
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
  const api = new TikSave();
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