import axios from "axios";
import * as cheerio from "cheerio";
class SaveMedia {
  constructor() {
    this.baseUrl = "https://savevideo.me/en/get/";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "text/html, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://savevideo.me/en/"
    };
  }
  async getMedia(url) {
    try {
      const {
        data
      } = await axios.post(this.baseUrl, `url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      let mediaList = [];
      $("a[download], img, source").each((_, el) => {
        const mediaUrl = $(el).attr("href") || $(el).attr("src");
        if (!mediaUrl) return;
        const size = $(el).parent().text().match(/–\s*([\d.]+)\s*(MB|KB)/i);
        const format = $(el).parent().text().match(/\(([^)]+)\)/);
        mediaList.push({
          [mediaUrl.startsWith("data:image") ? "base64" : "url"]: mediaUrl,
          size: size ? `${size[1]} ${size[2]}` : "Tidak diketahui",
          format: format ? format[1] : mediaUrl.split(".").pop().split("?")[0]
        });
      });
      return mediaList.length ? mediaList : new Error("Gagal menemukan media.");
    } catch (error) {
      throw new Error(`Gagal mengambil media: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    message: "No url provided"
  });
  const saveMedia = new SaveMedia();
  try {
    const result = await saveMedia.getMedia(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({
      message: "Error during media download",
      error: error.message
    });
  }
}