import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class Area51Scraper {
  constructor() {
    this.baseUrl = "https://area51.porn";
    this.proxy = url => `${proxy}${url.startsWith("http") ? "" : this.baseUrl}${url}`;
  }
  async request(url) {
    const proxied = this.proxy(url);
    try {
      const {
        data
      } = await axios.get(proxied, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: this.baseUrl,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        timeout: 2e4
      });
      return data;
    } catch (err) {
      throw new Error(`Request failed: ${err.message}`);
    }
  }
  async home() {
    try {
      const data = await this.request("/");
      const $ = cheerio.load(data);
      const videos = [];
      $("#list_videos_most_recent_videos_items .item").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a").first();
        const url = $link.attr("href") || "";
        if (!url) return;
        const videoId = url.match(/\/view\/(\d+)\//)?.[1] || "";
        const title = $link.attr("title")?.trim() || $link.find(".title").text().trim() || "No title";
        const thumbnail = $el.find("img.thumb").attr("src") || "";
        const preview = $el.find("img.thumb").attr("data-preview") || "";
        const durationRaw = $el.find(".is-hd").text().trim();
        const isHD = durationRaw.includes("HD");
        const duration = durationRaw.replace(/<i>.*<\/i>/, "").trim() || "0:00";
        const views = $el.find(".views span").text().trim() || "0";
        const rating = $el.find(".raitig-card").text().trim() || "0%";
        const category = $el.find(".item_cat").text().trim() || "";
        videos.push({
          videoId: videoId,
          title: title.length > 120 ? title.substring(0, 117) + "..." : title,
          url: url,
          thumbnail: thumbnail ? this.proxy(thumbnail) : "",
          preview: preview ? this.proxy(preview) : "",
          duration: duration,
          isHD: isHD,
          views: this.parseViews(views),
          rating: rating,
          category: category
        });
      });
      return {
        videos: videos,
        total: videos.length,
        sectionTitle: $("h1").first().text().trim() || "Today's Best XXX Vids"
      };
    } catch (error) {
      console.error("Home error:", error.message);
      return {
        videos: [],
        total: 0,
        sectionTitle: "Error"
      };
    }
  }
  async search({
    query = "",
    page = 1
  }) {
    try {
      const path = `/search/${encodeURIComponent(query)}${page > 1 ? `/${page}/` : "/"}`;
      const data = await this.request(path);
      const $ = cheerio.load(data);
      const videos = [];
      $("#list_videos_videos_list_search_result_items .item").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a").first();
        const url = $link.attr("href") || "";
        if (!url) return;
        const videoId = url.match(/\/view\/(\d+)\//)?.[1] || "";
        const title = $link.attr("title")?.trim() || $link.find(".title").text().trim() || "No title";
        const thumbnail = $el.find("img.thumb").attr("src") || "";
        const preview = $el.find("img.thumb").attr("data-preview") || "";
        const durationRaw = $el.find(".is-hd").text().trim();
        const isHD = durationRaw.includes("HD");
        const duration = durationRaw.replace(/<i>.*<\/i>/, "").trim() || "0:00";
        const views = $el.find(".views span").text().trim() || "0";
        const rating = $el.find(".raitig-card").text().trim() || "0%";
        const category = $el.find(".item_cat").text().trim() || "";
        videos.push({
          videoId: videoId,
          title: title.length > 120 ? title.substring(0, 117) + "..." : title,
          url: url,
          thumbnail: thumbnail ? this.proxy(thumbnail) : "",
          preview: preview ? this.proxy(preview) : "",
          duration: duration,
          isHD: isHD,
          views: this.parseViews(views),
          rating: rating,
          category: category
        });
      });
      const totalResults = $("h1").text().match(/«\s*Indo\s*»/) ? videos.length : 0;
      return {
        videos: videos,
        total: videos.length,
        searchQuery: query,
        page: Number(page),
        hasMore: !!$(".pagination .next").length,
        totalResults: totalResults
      };
    } catch (error) {
      console.error("Search error:", error.message);
      return {
        videos: [],
        total: 0,
        searchQuery: query,
        page: page,
        hasMore: false
      };
    }
  }
  async detail({
    url = ""
  }) {
    try {
      const path = url.includes(this.baseUrl) ? url.replace(this.baseUrl, "") : url;
      const data = await this.request(path);
      const $ = cheerio.load(data);
      const title = $("h1").first().text().trim() || "No title";
      const videoId = path.match(/\/view\/(\d+)\//)?.[1] || "";
      const infoItems = $(".block-details .item").last().find("span em");
      const duration = infoItems.eq(0).text().trim() || "0:00";
      const views = infoItems.eq(1).text().trim() || "0";
      const submitted = infoItems.eq(2).text().trim() || "Unknown";
      const ratingText = $(".voters em").text().trim() || "0%";
      const votes = $(".voters").text().match(/\((\d+)\s*votes?\)/)?.[1] || "0";
      const thumbnail = $(".fp-poster img").attr("src") || "";
      const preview = $("img.thumb").first().attr("data-preview") || "";
      const categories = [];
      const tags = [];
      $('.block-details a[href*="/category/"]').each((_, el) => categories.push($(el).text().trim()));
      $('.block-details a[href*="/tags/"]').each((_, el) => tags.push($(el).text().trim()));
      const screenshots = [];
      $("#tab_screenshots a.item").each((_, el) => {
        const src = $(el).find("img").attr("src") || "";
        const full = $(el).attr("href") || "";
        if (src) screenshots.push({
          thumb: this.proxy(src),
          full: this.proxy(full)
        });
      });
      let videoUrl = "";
      const script = $("script:contains('flashvars')").html() || "";
      const match = script.match(/video_url:\s*'([^']+)'/);
      if (match) {
        const raw = decodeURIComponent(match[1].replace(/\\\//g, "/"));
        videoUrl = this.proxy(raw);
      }
      const embedCode = `<iframe src="${this.baseUrl}/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
      return {
        videoId: videoId,
        title: title,
        url: this.baseUrl + path,
        thumbnail: thumbnail ? this.proxy(thumbnail) : "",
        preview: preview ? this.proxy(preview) : "",
        duration: duration,
        views: this.parseViews(views),
        submitted: submitted,
        rating: ratingText,
        votes: Number(votes),
        categories: categories,
        tags: tags,
        screenshots: screenshots,
        videoUrl: videoUrl,
        embedCode: embedCode,
        isHD: duration.includes("HD") || title.toLowerCase().includes("hd")
      };
    } catch (error) {
      console.error("Detail error:", error.message);
      return {
        videoId: "",
        title: "Error",
        url: url,
        thumbnail: "",
        preview: "",
        duration: "0:00",
        views: 0,
        submitted: "",
        rating: "0%",
        votes: 0,
        categories: [],
        tags: [],
        screenshots: [],
        videoUrl: "",
        embedCode: "",
        isHD: false
      };
    }
  }
  parseViews(str) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ""));
    const suffix = str.replace(/[0-9.]/g, "").trim().toLowerCase();
    if (suffix.includes("k")) return Math.round(num * 1e3);
    if (suffix.includes("m")) return Math.round(num * 1e6);
    return Number(str) || 0;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const scraper = new Area51Scraper();
  try {
    let result;
    switch (action) {
      case "home":
        result = await scraper.home();
        break;
      case "search":
        if (!params.query) return res.status(400).json({
          error: "Paramenter 'query' wajib."
        });
        result = await scraper.search(params);
        break;
      case "detail":
        if (!params.url) return res.status(400).json({
          error: "Paramenter 'url' wajib."
        });
        result = await scraper.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
}