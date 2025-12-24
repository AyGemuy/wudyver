import axios from "axios";
import * as cheerio from "cheerio";
class TNAFlixScraper {
  constructor() {
    this.config = {
      baseUrl: "https://www.tnaflix.com",
      endpoint: "/"
    };
    this.proxiedBase = this.config.baseUrl;
  }
  async home() {
    try {
      console.log("Fetching TNAFlix home page data...");
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
      $(".row.video-list .col-xs-6.col-md-4.col-xl-3.mb-3").each((_, el) => {
        const $el = $(el);
        const videoId = $el.attr("data-vid") || "";
        const title = $el.find(".video-title").text()?.trim() || "No title";
        const url = $el.find(".video-title").attr("href") || "";
        const thumbnail = $el.find("img").attr("src") || $el.find("img").attr("data-src") || "";
        const preview = $el.find(".trailer-player source").attr("src") || "";
        const duration = $el.find(".thumb-icon.video-duration").text()?.trim() || "0:00";
        const quality = $el.find(".thumb-icon.max-quality").text()?.trim() || "SD";
        const views = $el.find(".icon-eye").parent().text()?.trim().replace("K", "000") || "0";
        const rating = $el.find(".icon-thumb-up").parent().text()?.trim() || "0%";
        const uploader = $el.find(".badge-video-info").text()?.trim() || "Unknown";
        videos.push({
          videoId: videoId,
          title: title,
          url: url,
          thumbnail: thumbnail,
          preview: preview,
          duration: duration,
          quality: quality,
          views: views,
          rating: rating,
          uploader: uploader
        });
      });
      console.log(`Fetched ${videos.length} videos from TNAFlix home page`);
      return {
        videos: videos,
        total: videos.length,
        filters: filters,
        sectionTitle: "Featured Videos"
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
        sectionTitle: "Featured Videos"
      };
    }
  }
  async search({
    query = "",
    ...rest
  }) {
    try {
      console.log(`Searching TNAFlix for query: ${query}`);
      const path = `/search?what=${encodeURIComponent(query)}`;
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
      $(".row.video-list .col-xs-6.col-md-4.col-xl-3.mb-3").each((_, el) => {
        const $el = $(el);
        const videoId = $el.attr("data-vid") || "";
        const title = $el.find(".video-title").text()?.trim() || "No title";
        const url = $el.find(".video-title").attr("href") || "";
        const thumbnail = $el.find("img").attr("src") || $el.find("img").attr("data-src") || "";
        const preview = $el.find(".trailer-player source").attr("src") || "";
        const duration = $el.find(".thumb-icon.video-duration").text()?.trim() || "0:00";
        const quality = $el.find(".thumb-icon.max-quality").text()?.trim() || "SD";
        const views = $el.find(".icon-eye").parent().text()?.trim().replace("K", "000") || "0";
        const rating = $el.find(".icon-thumb-up").parent().text()?.trim() || "0%";
        const uploader = $el.find(".badge-video-info").text()?.trim() || "Unknown";
        videos.push({
          videoId: videoId,
          title: title,
          url: url,
          thumbnail: thumbnail,
          preview: preview,
          duration: duration,
          quality: quality,
          views: views,
          rating: rating,
          uploader: uploader
        });
      });
      $(".dropdown .dropdown-menu li a").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const value = $el.attr("href")?.match(/u=(\w+)/)?.[1] || "";
        const isActive = $el.parent().hasClass("active");
        if (value) filters.sortOptions.push({
          name: name,
          value: value,
          isActive: isActive
        });
      });
      $(".dropdown .dropdown-menu li a").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const value = $el.attr("href")?.match(/d=(\w+)/)?.[1] || "";
        const isActive = $el.parent().hasClass("active");
        if (value) filters.durationRange[value] = {
          name: name,
          value: value,
          isActive: isActive
        };
      });
      console.log(`Found ${videos.length} videos for query: ${query}`);
      return {
        videos: videos,
        total: videos.length,
        filters: filters,
        searchQuery: query
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
    url = ""
  }) {
    try {
      console.log(`Fetching TNAFlix details for URL: ${url}`);
      const path = url.startsWith(this.config.baseUrl) ? url.replace(this.config.baseUrl, "") : url;
      const {
        data
      } = await axios.get(this.proxiedBase + path);
      const $ = cheerio.load(data);
      const title = $('meta[property="og:title"]').attr("content")?.trim() || $("title").text()?.trim() || "No title";
      const description = $('meta[property="og:description"]').attr("content")?.trim() || $(".video-detail-description").text()?.trim() || "No description";
      const thumbnail = $('meta[property="og:image"]').attr("content") || $('meta[itemprop="image"]').attr("content") || "";
      const uploadDate = $('meta[itemprop="uploadDate"]').attr("content") || $(".badge.btn-nohover .icon-clock-o").parent().text()?.trim() || "Unknown";
      const duration = $('meta[itemprop="duration"]').attr("content")?.replace("PT", "") || $("#video-player").attr("data-duration") || "0:00";
      const views = $(".badge.btn-nohover .icon-eye").parent().text()?.trim().replace("K", "000") || "0";
      const likes = $(".badge.btn-nohover .icon-thumb-up").parent().text()?.trim() || "0%";
      const videoId = $("#video-player").attr("data-vid") || "";
      const videoUrls = [];
      $("#video-player source").each((_, el) => {
        const $el = $(el);
        const quality = $el.attr("size") || "Unknown";
        const url = $el.attr("src") || "";
        videoUrls.push({
          quality: quality,
          url: url
        });
      });
      const tags = [];
      $(".video-detail-badges .badge-video").each((_, el) => {
        const tag = $(el).text()?.trim();
        if (tag && !tag.includes("%") && !tag.includes("ago") && !tag.includes("K")) tags.push(tag);
      });
      const jsonLd = $('script[type="application/ld+json"]').html();
      const structuredData = jsonLd ? JSON.parse(jsonLd) : {};
      const structuredName = structuredData?.name?.trim() || "";
      const structuredDescription = structuredData?.description?.trim() || "";
      const structuredThumbnail = structuredData?.thumbnailUrl || "";
      const structuredUploadDate = structuredData?.uploadDate || "Unknown";
      const structuredDuration = structuredData?.duration?.replace("PT", "") || "0:00";
      console.log(`Fetched details for ${title}`);
      return {
        title: structuredName || title,
        description: structuredDescription || description,
        thumbnail: structuredThumbnail || thumbnail,
        uploadDate: structuredUploadDate || uploadDate,
        duration: structuredDuration || duration,
        views: views,
        likes: likes,
        videoUrls: videoUrls,
        tags: tags,
        videoId: videoId
      };
    } catch (error) {
      console.error(`Error fetching details for ${url}:`, error.message);
      return {
        title: "",
        description: "",
        thumbnail: "",
        uploadDate: "",
        duration: "",
        views: "0",
        likes: "0",
        videoUrls: [],
        tags: [],
        videoId: ""
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
  const api = new TNAFlixScraper();
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