import axios from "axios";
import * as cheerio from "cheerio";
class McpedlScraper {
  constructor() {}
  async list(page = 1) {
    try {
      const {
        data
      } = await axios.get(`https://mcpedl.org/downloading/page/${page}`);
      const $ = cheerio.load(data);
      return $("article.tease.tease-post > section.entry-header-category").map((_, el) => ({
        thumbnail: $(el).find("a.post-thumbnail > picture > img").attr("data-src") || "",
        title: $(el).find("h2.entry-title").text().trim() || "No title",
        id: $(el).find("h2.entry-title > a").attr("href")?.split("/").at(-2) || "No ID"
      })).get();
    } catch (error) {
      return error?.response?.status === 404 ? {
        error: true,
        message: "Page Not Found"
      } : Promise.reject(error);
    }
  }
  async download(id) {
    try {
      const {
        data
      } = await axios.get(`https://mcpedl.org/${id}`);
      const $ = cheerio.load(data);
      const dlLink = $("#download-link table tbody tr td a").attr("href");
      if (!dlLink) throw new Error("Download link not found");
      const {
        data: dlData
      } = await axios.get(`https://mcpedl.org/dw_file.php?id=${dlLink.split("/").at(-1)}`);
      const _$ = cheerio.load(dlData);
      const url = _$("a").attr("href");
      if (!url) throw new Error("Actual download link not found");
      return {
        url: url,
        version: $("#download-link table tbody tr td").eq(0).text().trim() || "Unknown",
        size: $(".entry-footer span:last-child").text().trim() || "Unknown"
      };
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
  async search(query, max = 10) {
    try {
      const {
        data
      } = await axios.get(`https://mcpedl.org/?s=${encodeURIComponent(query)}`);
      const $ = cheerio.load(data);
      return {
        success: true,
        result: $(".g-block.size-20 article").map((i, el) => i >= max ? null : {
          title: $(el).find(".entry-title a").text().trim() || "No title",
          link: $(el).find(".entry-title a").attr("href") || "No link",
          image: $(el).find(".post-thumbnail img").attr("data-srcset") || $(el).find(".post-thumbnail img").attr("src") || "No image",
          rating: $(el).find(".rating-wrapper span").text().trim() || "No rating"
        }).get()
      };
    } catch (error) {
      return {
        success: false,
        result: [],
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    page,
    id,
    query,
    max
  } = req.method === "GET" ? req.query : req.body;
  const scraper = new McpedlScraper();
  try {
    if (!action) return res.status(400).json({
      error: "Action parameter is required"
    });
    switch (action) {
      case "list":
        return res.status(200).json(await scraper.list(parseInt(page, 10) || 1));
      case "download":
        if (!id) return res.status(400).json({
          error: "ID parameter is required for download"
        });
        return res.status(200).json(await scraper.download(id));
      case "search":
        if (!query) return res.status(400).json({
          error: "Query parameter is required for search"
        });
        return res.status(200).json(await scraper.search(query, parseInt(max, 10) || 10));
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}