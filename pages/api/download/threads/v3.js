import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.apiHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1`;
  }
  getId(url) {
    return url.match(/\/post\/([\w-]+)/)?.[1];
  }
  getUrl(url) {
    const token = new URL(url).searchParams.get("token")?.split(".")[1];
    return token ? JSON.parse(Buffer.from(token, "base64"))?.url : url;
  }
  async download({
    url
  }) {
    const id = this.getId(url);
    if (!id) return {
      error: "Invalid Threads URL"
    };
    try {
      const {
        data
      } = await axios.get(`${this.apiHtml}?url=https://threadster.app/download/${id}`);
      const $ = cheerio.load(data);
      return {
        profilePic: this.getUrl($(".download__item__profile_pic img").attr("src")) || "",
        username: $(".download__item__profile_pic div span").text().trim() || "Unknown",
        caption: $(".download__item__caption__text").text().trim() || "No Caption",
        downloads: $("table tbody tr").map((_, el) => {
          const link = $(el).find("a").attr("href") || "";
          return link.startsWith("https") ? {
            resolution: $(el).find("th, td").eq(0).text().trim(),
            link: this.getUrl(link)
          } : null;
        }).get().filter(Boolean)
      };
    } catch {
      return {
        error: "Failed to fetch data"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}