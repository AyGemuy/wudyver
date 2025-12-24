import axios from "axios";
import * as cheerio from "cheerio";
class MediaExtractor {
  constructor() {
    this.url = "https://www.expertsphp.com/facebook-video-downloader.php";
    this.headers = {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getRedirect(url) {
    try {
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      return response.headers.location || url;
    } catch (error) {
      return error.response?.headers?.location || url;
    }
  }
  async fetch(inputUrl) {
    const videoUrl = await this.getRedirect(inputUrl);
    try {
      const {
        data
      } = await axios.post(this.url, new URLSearchParams({
        url: videoUrl
      }), {
        headers: this.headers
      });
      return this.extract(data);
    } catch {
      return [];
    }
  }
  extract(html) {
    const $ = cheerio.load(html);
    return $("video[src^='https'], img[src^='https']").map((_, el) => ({
      type: $(el).is("video") ? "video" : "image",
      url: $(el).attr("src")
    })).get();
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const pin = new MediaExtractor();
  try {
    const data = await pin.fetch(params.url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}