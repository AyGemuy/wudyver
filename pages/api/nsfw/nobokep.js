import axios from "axios";
import * as cheerio from "cheerio";
const fixUrl = url => url.startsWith("//") ? url.replace(/^\/\//, "https://") : url;
class WebScraper {
  constructor() {}
  async search(query) {
    const searchUrl = `https://nobokep.life/?s=${encodeURIComponent(query)}`;
    try {
      const {
        data: html
      } = await axios.get(searchUrl);
      const $ = cheerio.load(html);
      return $("article").map((i, el) => ({
        title: $(el).find("a").attr("title") || "No Title",
        link: $(el).find("a").attr("href") || "",
        duration: $(el).find(".duration").text() || "00:00"
      })).get();
    } catch (e) {
      console.error("Error while searching:", e);
      return [];
    }
  }
  async detail(url) {
    try {
      const {
        data: html
      } = await axios.get(url);
      const $ = cheerio.load(html);
      return {
        meta: {
          author: $('meta[itemprop="author"]').attr("content") || "",
          name: $('meta[itemprop="name"]').attr("content") || "",
          description: $('meta[itemprop="description"]').attr("content") || "",
          duration: $('meta[itemprop="duration"]').attr("content") || "",
          thumbnail: $('meta[itemprop="thumbnailUrl"]').attr("content") || "",
          embed: fixUrl($('meta[itemprop="embedURL"]').attr("content") || ""),
          upload: $('meta[itemprop="uploadDate"]').attr("content") || ""
        },
        iframe: fixUrl($("iframe[data-lazy-src]").attr("data-lazy-src") || ""),
        download: $('a[onclick*="go"]').map((_, el) => fixUrl($(el).attr("onclick")?.split("'")[1])).get()
      };
    } catch (e) {
      console.error("Error while fetching details:", e);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action parameter is required"
    });
  }
  if (action === "search") {
    if (!query) {
      return res.status(400).json({
        error: "Query parameter is required for search action"
      });
    }
    const scraper = new WebScraper();
    const results = await scraper.search(query);
    return res.status(200).json({
      result: results
    });
  }
  if (action === "detail") {
    if (!url) {
      return res.status(400).json({
        error: "URL parameter is required for detail action"
      });
    }
    const scraper = new WebScraper();
    const resultDetail = await scraper.detail(url);
    return res.status(200).json({
      result: resultDetail
    });
  }
  return res.status(400).json({
    error: "Invalid action or missing query/url parameter"
  });
}