import axios from "axios";
import * as cheerio from "cheerio";
class SaveIg {
  constructor() {
    this.api = "https://saveig.in/wp-json/visolix/api/download";
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
    return $(".visolix-download-content").map((em, el) => {
      const scope = $(el);
      const btn = scope.find("a.visolix-download-media");
      const rawUrl = btn.attr("href");
      const rawIcon = scope.find("img").eq(0).attr("src");
      const rawThumb = scope.find("img").eq(1).attr("src");
      const cleanUrl = rawUrl ? new URL(rawUrl).href : null;
      const cleanIcon = rawIcon ? new URL(rawIcon).href : null;
      const cleanThumb = rawThumb ? new URL(rawThumb).href : null;
      const label = btn.text()?.trim() || "Download";
      const fileId = cleanUrl ? new URL(cleanUrl).searchParams.get("id") : null;
      const isVideo = cleanUrl?.includes("dl.php") || label.toLowerCase().includes("video");
      return cleanUrl ? {
        index: em,
        type: isVideo ? "video" : "image",
        label: label,
        file_id: fileId || "N/A",
        url: cleanUrl,
        thumbnail: cleanThumb,
        icon_asset: cleanIcon
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
        url: url
      });
      const htmlData = res?.status ? res?.data : null;
      if (!htmlData) throw new Error("API Error or No Data");
      const result = this.par(htmlData);
      this.log(`Success. Found ${result.length} media.`);
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
  const api = new SaveIg();
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