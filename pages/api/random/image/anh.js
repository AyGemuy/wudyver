import axios from "axios";
import * as cheerio from "cheerio";
class Anhmoe {
  constructor() {
    this.baseURL = "https://anh.moe";
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Host: "anh.moe",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"'
    };
    this.validCategories = ["sfw", "nsfw", "video-gore", "video-nsfw", "moe", "ai-picture", "hentai"];
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 3e4,
      headers: this.headers
    });
  }
  async search({
    category = "sfw",
    page = null,
    query = "",
    ...rest
  } = {}) {
    try {
      if (!this.validCategories?.includes?.(category)) {
        throw new Error(`Invalid category: ${category}. Valid options are: ${this.validCategories?.join?.(", ") || "none"}`);
      }
      let url = page || `/category/${category}`;
      if (query) {
        const urlObj = new URL(url, this.baseURL);
        urlObj.searchParams.set("search", query);
        url = urlObj.pathname + urlObj.search;
      }
      const config = {
        headers: {
          ...this.headers,
          Referer: page ? new URL(page, this.baseURL)?.href : `${this.baseURL}/`
        }
      };
      const response = page ? await axios.get(url, config) : await this.api.get(url);
      const $ = cheerio.load(response?.data || "");
      const items = $(".list-item").map((index, el) => {
        try {
          const $el = $(el);
          let data = {};
          const rawData = $el.attr("data-object");
          if (rawData) {
            try {
              data = JSON.parse(decodeURIComponent(rawData));
            } catch (parseError) {
              console.warn("Failed to parse data object:", parseError.message);
            }
          }
          const titleElement = $el.find(".list-item-desc-title a");
          const imageElement = $el.find(".list-item-image a");
          const uploaderElement = $el.find(".list-item-desc-title div");
          return {
            type: data?.type || "unknown",
            title: titleElement.attr("title") || data?.title || `Item ${index + 1}`,
            viewLink: imageElement.attr("href") ? new URL(imageElement.attr("href"), this.baseURL).href : "",
            media: data?.type ? {
              ...data?.image,
              sizeFormatted: data?.size_formatted,
              width: data?.width,
              height: data?.height,
              uploaded: data?.how_long_ago
            } : null,
            uploadBy: uploaderElement.text()?.trim() || "Unknown"
          };
        } catch (itemError) {
          console.warn(`Error processing item ${index}:`, itemError.message);
          return null;
        }
      }).get().filter(item => item !== null);
      const nextLink = $("li.pagination-next a").attr("href");
      const prevLink = $("li.pagination-prev a").attr("href");
      const nextPage = nextLink ? new URL(nextLink, this.baseURL).href : null;
      const prevPage = prevLink ? new URL(prevLink, this.baseURL).href : null;
      return {
        success: true,
        category: category,
        query: query || null,
        page: page || 1,
        totalItems: items.length,
        contents: items,
        nextPage: nextPage,
        prevPage: prevPage,
        additionalParams: Object.keys(rest).length > 0 ? rest : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Search error:", error.message);
      return {
        success: false,
        error: error.message,
        category: category,
        query: query || null,
        page: page || null,
        contents: [],
        nextPage: null,
        prevPage: null,
        timestamp: new Date().toISOString()
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const anh = new Anhmoe();
    const response = await anh.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}