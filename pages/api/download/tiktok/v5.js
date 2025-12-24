import axios from "axios";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class TikDD {
  constructor() {
    this.url = "https://www.tikdd.cc/wp-json/aio-dl/video-data/";
    this.headers = {
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://www.tikdd.cc",
      referer: "https://www.tikdd.cc/",
      "user-agent": "Postify/1.0.0",
      cookie: "pll_language=en",
      ...SpoofHead()
    };
  }
  async token() {
    const {
      data
    } = await axios.get("https://www.tikdd.cc");
    const $ = cheerio.load(data);
    const token = $("#token").val();
    if (!token) throw new Error("Tokennya gak ada 😆");
    return token;
  }
  urlHash(url) {
    return btoa(url) + (url.length + 1e3) + btoa("aio-dl");
  }
  async download(videoUrl) {
    const token = await this.token();
    const hash = this.urlHash(videoUrl);
    const response = await axios.post(this.url, new URLSearchParams({
      url: videoUrl,
      token: token,
      hash: hash
    }), {
      headers: this.headers
    });
    return response.data;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const tikdd = new TikDD();
    const data = await tikdd.download(url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}