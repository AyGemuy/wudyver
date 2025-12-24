import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class TikVideo {
  constructor() {
    this.url = "https://tikvideo.app/api/ajaxSearch";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://tikvideo.app",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://tikvideo.app/id",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async download(query) {
    try {
      const data = new URLSearchParams();
      data.append("q", query);
      data.append("lang", "id");
      data.append("cftoken", "");
      const response = await this.client.post(this.url, data, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data.data);
      return $(".video-data .tik-video").map((_, el) => ({
        thumbnail: $(el).find(".thumbnail img").attr("src") || "",
        title: $(el).find(".content h3").text() || "No Title",
        download: $(el).find(".dl-action a").map((_, em) => ({
          title: $(em).text().trim() || "No Label",
          link: $(em).attr("href") || "#"
        })).get()
      })).get()[0];
    } catch (error) {
      console.error("Error fetching TikVideo:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  try {
    const downloader = new TikVideo();
    const result = await downloader.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}