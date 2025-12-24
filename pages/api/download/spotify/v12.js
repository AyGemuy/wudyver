import axios from "axios";
import * as cheerio from "cheerio";
class SpotifyDownloader {
  constructor() {
    this.baseUrl = "https://spotifydownloader.pro/";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        referer: this.baseUrl,
        "sec-fetch-mode": "navigate",
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"
      }
    });
  }
  async fetchCookies() {
    try {
      const res = await this.client.get("/");
      const cookies = res.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";
      this.client.defaults.headers.cookie = cookies;
      console.log("[OK] Cookies set");
    } catch (e) {
      console.error("[ERR] Fetch cookies:", e.message);
    }
  }
  async download(url) {
    if (!this.client.defaults.headers.cookie) await this.fetchCookies();
    try {
      console.log("[INFO] Downloading...");
      const res = await this.client.post("/", `url=${encodeURIComponent(url)}`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseUrl
        }
      });
      return this.parseResponse(res.data);
    } catch (e) {
      console.error("[ERR] Download failed:", e.message);
      return [];
    }
  }
  parseResponse(html) {
    const $ = cheerio.load(html);
    const results = $(".res_box tr").map((_, el) => ({
      title: $(el).find(".rb_title").text().trim() || "No Title",
      artist: $(el).find(".rb_title em, .rb_title span").text().trim() || "Unknown",
      image: $(el).find(".rb_icon").attr("src") || "",
      link: $(el).find(".rb_btn").attr("href") || ""
    })).get();
    console.log("[OK] Parsing complete:", results.length, "results found");
    return results;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing required query parameter: url"
    });
  }
  try {
    const spotify = new SpotifyDownloader();
    const result = await spotify.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}