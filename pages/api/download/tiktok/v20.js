import axios from "axios";
import * as cheerio from "cheerio";
class TikDownloader {
  constructor() {
    this.base = "https://albertaibdconsortium.ca";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  rf() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    let id = "";
    for (let i = 0; i < 68; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  }
  parseToken(url) {
    if (!url) return null;
    try {
      const uri = new URL(url);
      const token = uri.searchParams.get("token");
      if (!token) return null;
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const decodedUri = new URL(decoded);
      const params = decodedUri.searchParams;
      return {
        full_url: decoded,
        mime: params.get("mime_type") || "",
        is_video: /video/i.test(params.get("mime_type") || decoded),
        is_audio: /audio/i.test(params.get("mime_type") || decoded),
        expire: params.get("expire") ? new Date(parseInt(params.get("expire")) * 1e3).toISOString() : null,
        region: /tos-([a-z0-9]+)-/i.exec(decoded)?.[1] || "unknown"
      };
    } catch (e) {
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    const fpestid = this.rf();
    try {
      const {
        data: html
      } = await axios.post(this.base + "/", `url=${encodeURIComponent(url)}`, {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          cookie: `fpestid=${fpestid}`,
          "hx-request": "true",
          origin: this.base,
          referer: this.base + "/",
          "user-agent": this.ua
        },
        ...rest
      });
      const $ = cheerio.load(html);
      const allLinks = $("a").map((i, el) => $(el).attr("href")).get();
      let video = null;
      let music = null;
      let info_token = null;
      for (const link of allLinks) {
        const decodedData = this.parseToken(link);
        if (decodedData) {
          if (decodedData.is_video && !video) {
            video = link;
            info_token = decodedData;
          } else if (decodedData.is_audio && !music) {
            music = link;
          }
        }
      }
      if (!video) throw new Error("VIDEO_NOT_FOUND");
      return {
        result: {
          video: video,
          music: music,
          title: $("h3").eq(0).text().trim() || "No Title",
          desc: $("p.line-clamp-3").text().trim() || "",
          thumb: $("img.object-cover").attr("src") || "",
          info: {
            source: "SnapTik (Alberta)",
            mime_type: info_token?.mime,
            expires: info_token?.expire,
            region: info_token?.region,
            at: new Date().toISOString()
          }
        }
      };
    } catch (e) {
      return {
        result: null,
        error: e.message,
        status: e?.response?.status || 500
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