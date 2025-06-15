import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class SoundCloudDownloader {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.apiUrl = "https://soundcloudtool.com/soundcloud-downloader-tool";
    this.headers = {
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://soundcloudtool.com",
      referer: "https://soundcloudtool.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async fetchCSRFToken() {
    try {
      const {
        data
      } = await this.client.get(this.apiUrl, {
        headers: this.headers
      });
      return cheerio.load(data)?.('input[name="csrfmiddlewaretoken"]').val();
    } catch {
      return null;
    }
  }
  extractDownload(data) {
    const $ = cheerio.load(data);
    return $(".downloader-container").map((_, elem) => ({
      title: $(elem).find("p").text().trim() || "Unknown title",
      downloadLink: $(elem).find("#trackLink").attr("href") || "",
      filename: $(elem).find("#trackLink").data("filename") || "Unknown filename",
      thumbnail: $(elem).find(".thumb img").attr("src") || ""
    })).get();
  }
  async downloadTrack(link) {
    const csrfToken = await this.fetchCSRFToken();
    if (!csrfToken) return {
      status: false,
      message: "CSRF token missing"
    };
    try {
      const {
        data
      } = await this.client.post(this.apiUrl, `csrfmiddlewaretoken=${csrfToken}&soundcloud=${encodeURIComponent(link)}`, {
        headers: this.headers
      });
      const results = this.extractDownload(data);
      return results.length ? {
        status: true,
        results: results
      } : {
        status: false,
        message: "No tracks found"
      };
    } catch {
      return {
        status: false,
        message: "Failed to download track"
      };
    }
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
    const downloader = new SoundCloudDownloader();
    const result = await downloader.downloadTrack(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}