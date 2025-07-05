import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import qs from "qs";
class YouTubeDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
  }
  async getCookiesAndCsrfToken() {
    try {
      const response = await this.client.get("https://py.bima-pustaka.my.id/youtube/");
      const cookies = await this.jar.getCookieString("https://py.bima-pustaka.my.id/youtube/");
      const csrfToken = cookies.match(/csrftoken=([^;]+)/);
      if (csrfToken) return csrfToken[1];
      throw new Error("CSRF Token tidak ditemukan");
    } catch (error) {
      throw new Error(`Gagal mendapatkan CSRF Token: ${error.message}`);
    }
  }
  async postData(csrfToken, url, quality) {
    try {
      const response = await this.client.post("https://py.bima-pustaka.my.id/youtube/", qs.stringify({
        csrfmiddlewaretoken: csrfToken,
        youtube_link: url,
        resolution: quality
      }), {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          cookie: await this.jar.getCookieString("https://py.bima-pustaka.my.id/youtube/"),
          origin: "https://py.bima-pustaka.my.id",
          referer: "https://py.bima-pustaka.my.id/youtube/",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengirim data: ${error.message}`);
    }
  }
  parseHTML(html) {
    try {
      const $ = cheerio.load(html);
      return {
        title: $("h2").text().trim() || "No Title Found",
        description: $("blockquote").text().trim() || "No Description Found",
        resolutions: $("#resolution option").map((_, el) => $(el).val()).get().filter(Boolean),
        downloads: $("ul li a").map((_, el) => ({
          url: $(el).attr("href") || "No Url Found",
          label: $(el).text().trim().split(" ")[1] || "No Label Found"
        })).get()
      };
    } catch (error) {
      throw new Error(`Gagal memproses HTML: ${error.message}`);
    }
  }
  async youtube(url, quality = "360p") {
    try {
      const csrfToken = await this.getCookiesAndCsrfToken();
      const html = await this.postData(csrfToken, url, quality);
      return this.parseHTML(html);
    } catch (error) {
      throw new Error(`Error pada metode youtube: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      quality = "360p"
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "Invalid YouTube URL"
    });
    const downloader = new YouTubeDownloader();
    const data = await downloader.youtube(url, quality);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}