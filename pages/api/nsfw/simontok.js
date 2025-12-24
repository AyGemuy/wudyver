import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.baseProxyUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
    this.baseSearchUrl = "https://id.simontokx.org/?id=";
    this.baseResultUrl = "https://id.simontokx.org";
  }
  async search(query) {
    try {
      const response = await axios.get(this.baseProxyUrl + encodeURIComponent(this.baseSearchUrl + query));
      const $ = cheerio.load(response.data);
      return {
        updateInfo: $('div[style="background-color:black;color:#fff;padding:20px;"] p').text() || "No update info",
        alternativeAddress: $('div[style="background-color:black;color:#fff;padding:20px;"]').next().text() || "No alternative address",
        videos: $(".thumb-block").map((_, el) => ({
          title: $(el).find("p a").attr("title") || "No title",
          link: this.baseResultUrl + ($(el).find("p a").attr("href") || "#"),
          imgSrc: $(el).find("img").attr("data-src") || "",
          duration: $(el).find(".duration").text() || "No duration"
        })).get()
      };
    } catch {
      return null;
    }
  }
  async detail(url) {
    try {
      const response = await axios.get(this.baseProxyUrl + encodeURIComponent(url));
      const $ = cheerio.load(response.data);
      const downloadLink = $('a[title="Download"]').attr("href") || "#";
      const vParam = new URL(downloadLink).searchParams.get("v");
      const newDownloadLink = `https://musik-mp3.info/downl0ad.php?v=${encodeURIComponent(vParam)}`;
      const downloadResponse = await axios.get(newDownloadLink);
      const videoLinks = this.extractVideoLinks(downloadResponse.data);
      return {
        author: $('meta[itemprop="author"]').attr("content") || "Unknown",
        name: $('meta[itemprop="name"]').attr("content") || "No name",
        description: $('meta[itemprop="description"]').attr("content") || "No description",
        thumbnailUrl: $('meta[itemprop="thumbnailUrl"]').attr("content") || "",
        videoSrc: $("iframe.iframe-placeholder").attr("src") || "",
        downloadLink: newDownloadLink,
        videoLinks: videoLinks
      };
    } catch {
      return null;
    }
  }
  extractVideoLinks(html) {
    const $ = cheerio.load(html);
    const links = [];
    $("script").each((_, script) => {
      const scriptContent = $(script).html();
      if (scriptContent) {
        const $temp = cheerio.load(scriptContent);
        $temp("a").each((_, a) => {
          const href = $temp(a).attr("href");
          const title = $temp(a).attr("title") || "No title";
          if (href) links.push({
            href: href,
            title: title
          });
        });
      }
    });
    return links;
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new Downloader();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await downloader.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await downloader.detail(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}