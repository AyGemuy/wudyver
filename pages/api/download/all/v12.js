import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class VideoDownloader {
  constructor() {
    this.baseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }
  async fetchVideo(url) {
    try {
      const isLink = encodeURIComponent(`https://www.tubeninja.net/welcome?url=`);
      const {
        data
      } = await axios.get(`${this.baseUrl}${isLink}${encodeURIComponent(url)}`);
      return this.parse(cheerio.load(data));
    } catch (error) {
      console.error("Error fetching data:", error);
      return {};
    }
  }
  parse($) {
    const result = {};
    $(".col-sm-4 b").each((_, el) => {
      const key = $(el).find("i").attr("class")?.split("fa-fw fa-")[1]?.trim();
      const value = $(el).parent().text().replace(/\s+/g, " ").trim().split(" ")[0];
      if (key && value) result[key] = value;
    });
    result.title = $("h1.notopmargin").text().trim() || null;
    result.description = $("p").first().text().trim() || null;
    result.thumbnail = $(".img-fluid").attr("src") || null;
    result.better_quality_link = $(".vdplus-ad").attr("href") || null;
    result.formats = $(".list-group-item-action").map((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim().split("|").map(x => x.trim());
      const size = $(el).find("small").text().trim();
      return text.length === 2 ? {
        ext: text[0],
        quality: text[1].split(" ")[0],
        size: size || null,
        url: $(el).attr("href")
      } : null;
    }).get().filter(Boolean);
    return Object.fromEntries(Object.entries(result).filter(([_, v]) => v));
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new VideoDownloader();
    const result = await downloader.fetchVideo(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}