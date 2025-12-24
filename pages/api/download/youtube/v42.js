import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
class YouTubeMP4Downloader {
  constructor() {
    this.baseUrl = "https://youtubemp4.to";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9",
      Referer: `${this.baseUrl}/HAOT/`,
      Origin: this.baseUrl
    };
  }
  async fetchCookies() {
    try {
      const res = await axios.head(`${this.baseUrl}/HAOT/`, {
        headers: this.headers
      });
      return res.headers["set-cookie"] ? res.headers["set-cookie"].join("; ") : "";
    } catch {
      return "";
    }
  }
  async downloadVideo(url) {
    const cookies = await this.fetchCookies();
    const headers = {
      ...this.headers,
      Cookie: cookies,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest"
    };
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/download_ajax/`, qs.stringify({
        url: url
      }), {
        headers: headers
      });
      return this.parseDownloadPage(data);
    } catch {
      return null;
    }
  }
  parseDownloadPage(data) {
    const $ = cheerio.load(data?.result || "");
    return {
      title: $(".meta h2").text().trim() || "Unknown",
      thumbnail: $(".poster img").attr("src") || "",
      main: $(".meta .btn-red").attr("href") || "",
      other: $(".results-other table tbody tr").map((_, el) => ({
        quality: $(el).find("td:first-child").text().trim() || "Unknown",
        size: $(el).find("td:nth-child(2)").text().trim() || "Unknown",
        link: $(el).find("td:last-child a").attr("href") || ""
      })).get()
    };
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "No URL"
    });
    const youtube = new YouTubeMP4Downloader();
    const result = await youtube.downloadVideo(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}