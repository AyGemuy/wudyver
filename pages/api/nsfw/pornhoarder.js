import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class PornHoarderScraper {
  constructor() {
    this.config = {
      baseUrl: "https://ww2.pornhoarder.tw",
      baseProxy: `https://${apiConfig.DOMAIN_URL}/api/tools/web/proxy/v4?url=`,
      endpoint: "/"
    };
    this.proxiedBase = this.config.baseProxy + this.config.baseUrl;
    console.log("PornHoarderScraper initialized with CORS proxy");
  }
  async home() {
    try {
      console.log("Fetching home page data...");
      const {
        data
      } = await axios.get(this.proxiedBase + this.config.endpoint);
      const $ = cheerio.load(data);
      const videos = [];
      const filters = {
        sortOptions: [],
        dateAddedOptions: [],
        durationRange: {
          min: 0,
          max: 3600
        },
        verifiedUploaders: []
      };
      $(".video-list .video").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.video-link");
        const title = $el.find(".video-content h1").text()?.trim() || "No title";
        const url = $link.attr("href") || "";
        const thumbnail = $el.find(".video-image.primary").css("background-image")?.match(/url\("(.+?)"\)/)?.[1] || "";
        const duration = $el.find(".video-length").text()?.trim() || "0:00";
        const added = $el.find(".video-meta .item").eq(1).text()?.trim() || "Unknown";
        const size = $el.find(".video-meta .item").last().text()?.trim() || "0 MB";
        const server = $el.find(".video-meta .item").first().text()?.trim() || "Unknown";
        const videoId = url.match(/data-id="([^"]+)"/)?.[1] || "";
        const alreadyWatched = !!$el.find(".video-badge.already-watched").length;
        videos.push({
          title: title,
          url: url,
          thumbnail: thumbnail,
          duration: duration,
          added: added,
          size: size,
          server: server,
          videoId: videoId,
          alreadyWatched: alreadyWatched
        });
      });
      $(".sort-options a").each((_, el) => {
        const $el = $(el);
        const sortName = $el.text()?.trim() || "";
        const sortBy = $el.attr("data-sort") || "";
        const isActive = $el.hasClass("active");
        filters.sortOptions.push({
          name: sortName,
          value: sortBy,
          isActive: isActive
        });
      });
      $(".date-filter a").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const value = $el.attr("data-date") || "";
        const isActive = $el.hasClass("active");
        filters.dateAddedOptions.push({
          name: name,
          value: value,
          isActive: isActive
        });
      });
      filters.durationRange.min = 0;
      filters.durationRange.max = 3600;
      $(".author-filter a").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const flag = $el.attr("data-author") || "";
        const isActive = $el.hasClass("active");
        filters.verifiedUploaders.push({
          name: name,
          flag: flag,
          isActive: isActive
        });
      });
      const sectionTitle = $(".video-list").first().text()?.split("\n")[0]?.trim() || "Newest";
      console.log(`Fetched ${videos.length} videos from home page`);
      return {
        videos: videos,
        total: parseInt($(".total-results").text()?.match(/(\d+)/)?.[1] || "0"),
        filters: filters,
        sectionTitle: sectionTitle
      };
    } catch (error) {
      console.error("Error fetching home page:", error.message);
      return {
        videos: [],
        total: 0,
        filters: {
          sortOptions: [],
          dateAddedOptions: [],
          durationRange: {
            min: 0,
            max: 3600
          },
          verifiedUploaders: []
        },
        sectionTitle: "Newest"
      };
    }
  }
  async search({
    query = "",
    ...rest
  }) {
    try {
      console.log(`Searching for query: ${query}`);
      const path = `/search/?search=${encodeURIComponent(query)}`;
      const {
        data
      } = await axios.get(this.proxiedBase + path, {
        params: rest
      });
      const $ = cheerio.load(data);
      const videos = [];
      const filters = {
        sortOptions: [],
        durationRange: {
          min: 0,
          max: 3600
        },
        verifiedUploaders: []
      };
      $(".video-list .video").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.video-link");
        const title = $el.find(".video-content h1").text()?.trim() || "No title";
        const url = $link.attr("href") || "";
        const thumbnail = $el.find(".video-image.primary").css("background-image")?.match(/url\("(.+?)"\)/)?.[1] || "";
        const duration = $el.find(".video-length").text()?.trim() || "0:00";
        const added = $el.find(".video-meta .item").eq(1).text()?.trim() || "Unknown";
        const size = $el.find(".video-meta .item").last().text()?.trim() || "0 MB";
        const server = $el.find(".video-meta .item").first().text()?.trim() || "Unknown";
        const videoId = url.match(/data-id="([^"]+)"/)?.[1] || "";
        const alreadyWatched = !!$el.find(".video-badge.already-watched").length;
        videos.push({
          title: title,
          url: url,
          thumbnail: thumbnail,
          duration: duration,
          added: added,
          size: size,
          server: server,
          videoId: videoId,
          alreadyWatched: alreadyWatched
        });
      });
      $(".sort-options a").each((_, el) => {
        const $el = $(el);
        const sortName = $el.text()?.trim() || "";
        const sortBy = $el.attr("data-sort") || "";
        const isActive = $el.hasClass("active");
        filters.sortOptions.push({
          name: sortName,
          value: sortBy,
          isActive: isActive
        });
      });
      filters.durationRange.min = 0;
      filters.durationRange.max = 3600;
      $(".author-filter a").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const flag = $el.attr("data-author") || "";
        const isActive = $el.hasClass("active");
        filters.verifiedUploaders.push({
          name: name,
          flag: flag,
          isActive: isActive
        });
      });
      const searchQuery = $(".video-list").first().text()?.split("\n")[0]?.trim() || query;
      console.log(`Found ${videos.length} videos for query: ${query}`);
      return {
        videos: videos,
        total: parseInt($(".total-results").text()?.match(/(\d+)/)?.[1] || "0"),
        filters: filters,
        searchQuery: searchQuery
      };
    } catch (error) {
      console.error(`Error searching for ${query}:`, error.message);
      return {
        videos: [],
        total: 0,
        filters: {
          sortOptions: [],
          durationRange: {
            min: 0,
            max: 3600
          },
          verifiedUploaders: []
        },
        searchQuery: query
      };
    }
  }
  async detail({
    url = "",
    ...rest
  }) {
    try {
      console.log(`Fetching details for URL: ${url}`);
      const path = url.startsWith(this.config.baseUrl) ? url.replace(this.config.baseUrl, "") : url;
      const {
        data
      } = await axios.get(this.proxiedBase + path, {
        params: rest
      });
      const $ = cheerio.load(data);
      const title = $("h1").text()?.trim() || "No title";
      const description = $(".video-detail-description p").text()?.trim() || "No description";
      const thumbnail = $(".video-image.primary").css("background-image")?.match(/url\("(.+?)"\)/)?.[1] || "";
      const duration = $(".video-detail-meta .item").filter((_, el) => $(el).text().includes(":")).text()?.trim() || "0:00";
      const added = $(".video-detail-meta .item").filter((_, el) => $(el).text().includes("ago")).text()?.trim() || "Unknown";
      const size = $(".video-detail-meta .item").filter((_, el) => $(el).text().includes("MB") || $(el).text().includes("GB")).text()?.trim() || "0 MB";
      const server = $(".video-detail-meta .item").filter((_, el) => $(el).text().includes("stream")).text()?.trim() || "Unknown";
      const videoId = $(".video-option.js_detail_options_favourites_add").attr("data-id") || "";
      const videoUrls = [];
      const tags = [];
      $(".video-detail-servers .server-list li a").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";
        const serverName = $el.find("img").attr("alt") || "Unknown";
        videoUrls.push({
          quality: serverName,
          url: href
        });
      });
      $(".video-detail-keyword-list.keyword-list li a").each((_, el) => {
        const tag = $(el).text()?.trim();
        if (tag) tags.push(tag);
      });
      const author = $(".author-name a").text()?.trim() || "Unknown";
      const authorUrl = $(".author-name a").attr("href") || "";
      const iframeSrc = $(".video-player iframe").attr("src") || "";
      const downloadUrl = $(".video-option[title='Download video']").attr("href") || "";
      const favicon = $('link[rel="icon"]').attr("href") || "";
      const alreadyWatched = !!$(".video-badge.already-watched").length;
      console.log(`Fetched details for ${title}`);
      return {
        title: title,
        description: description,
        thumbnail: thumbnail,
        duration: duration,
        added: added,
        size: size,
        server: server,
        videoId: videoId,
        videoUrls: videoUrls,
        tags: tags,
        author: author,
        authorUrl: authorUrl,
        iframeSrc: iframeSrc,
        downloadUrl: downloadUrl,
        alreadyWatched: alreadyWatched,
        favicon: favicon
      };
    } catch (error) {
      console.error(`Error fetching details for ${url}:`, error.message);
      return {
        title: "",
        description: "",
        thumbnail: "",
        duration: "",
        added: "",
        size: "",
        server: "",
        videoId: "",
        videoUrls: [],
        tags: [],
        author: "",
        authorUrl: "",
        iframeSrc: "",
        downloadUrl: "",
        alreadyWatched: false,
        favicon: ""
      };
    }
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
  const api = new PornHoarderScraper();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "home":
        response = await api.home();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'detail' dan 'home'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}