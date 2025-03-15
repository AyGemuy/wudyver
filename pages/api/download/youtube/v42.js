import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class YouTubeMP4 {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar()
    }));
    this.baseUrl = "https://youtubemp4.to/download_ajax/";
    this.headers = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://youtubemp4.to",
      referer: "https://youtubemp4.to/O3GB/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async download(url) {
    try {
      const {
        data
      } = await this.client.post(this.baseUrl, `url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      if (!data.result) throw new Error("Response empty");
      return this.parseResult(data.result);
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  parseResult(html) {
    const $ = cheerio.load(html);
    return {
      title: $(".meta h2").text().trim(),
      duration: $(".meta p strong").filter((_, el) => $(el).text().includes("Duration")).parent().text().replace("Duration:", "").trim(),
      thumbnail: $(".poster img").attr("src") || "",
      downloadLink: $(".btn.btn-red").attr("href") || "",
      formats: $("a.btn[target='_blank']").map((_, el) => ({
        size: $(el).attr("data-size") || "Unknown",
        link: $(el).attr("data-href") || "#"
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
    const ytmp4 = new YouTubeMP4();
    const result = await ytmp4.download(url);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}