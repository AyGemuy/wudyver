import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class Rule34Scraper {
  constructor() {
    this.config = {
      baseUrl: "https://rule34video.com",
      baseProxy: `https://${apiConfig.DOMAIN_URL}/api/tools/web/proxy/v4?url=`,
      endpoint: "/"
    };
    this.proxiedBase = this.config.baseProxy + this.config.baseUrl;
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
      $("#custom_list_videos_most_recent_videos_items .item.thumb").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.th");
        const title = $link.attr("title") || $el.find(".thumb_title").text()?.trim() || "No title";
        const url = $link.attr("href") || "";
        const $img = $el.find("img.thumb");
        const thumbnail = $img.attr("data-original") || $img.attr("data-webp") || "";
        const preview = $el.find(".img.wrap_image").attr("data-preview") || "";
        const duration = $el.find(".time").text()?.trim() || "0:00";
        const added = $el.find(".added").text()?.trim().replace(/\s+/g, " ") || "Unknown";
        const ratingText = $el.find(".rating").text()?.trim() || "";
        const ratingMatch = ratingText.match(/(\d+)%\s*\((\d+)\)/);
        const rating = ratingMatch ? `${ratingMatch[1]}%` : "0%";
        const ratingCount = ratingMatch ? parseInt(ratingMatch[2]) : 0;
        const views = $el.find(".views").text()?.trim().replace(/\s+/g, " ") || "0";
        const quality = $el.find(".quality .custom-hd").length ? "HD" : "SD";
        const hasSound = !!$el.find(".sound").length;
        const futa = !!$el.find(".futa").length;
        const videoId = url.match(/\/video\/(\d+)/)?.[1] || "";
        videos.push({
          title: title,
          url: url,
          thumbnail: thumbnail,
          preview: preview,
          duration: duration,
          added: added,
          rating: rating,
          ratingCount: ratingCount,
          views: views,
          quality: quality,
          hasSound: hasSound,
          futa: futa,
          videoId: videoId
        });
      });
      $("#custom_list_videos_most_recent_videos_sort_list a.btn").each((_, el) => {
        const $el = $(el);
        const sortName = $el.text()?.trim() || "";
        const sortBy = $el.attr("data-parameters")?.match(/sort_by:(\w+)/)?.[1] || "";
        const isActive = $el.hasClass("active");
        filters.sortOptions.push({
          name: sortName,
          value: sortBy,
          isActive: isActive
        });
      });
      $(".sort_custom.filter-custom li a.js-filter-custom").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const value = $el.attr("data-parameters-custom") || "";
        const isActive = $el.hasClass("active");
        filters.dateAddedOptions.push({
          name: name,
          value: value,
          isActive: isActive
        });
      });
      const durationFilter = $("#filter_duration");
      filters.durationRange.min = parseInt(durationFilter.attr("data-min") || "0");
      filters.durationRange.max = parseInt(durationFilter.attr("data-max") || "3600");
      $(".filters-group--verified .filters-group__controls a.btn").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const flag = $el.attr("data-flag2") || "";
        const isActive = $el.hasClass("active");
        filters.verifiedUploaders.push({
          name: name,
          flag: flag,
          isActive: isActive
        });
      });
      const titleEl = $(".headline .title");
      let sectionTitle = titleEl.clone().children().remove().end().text().trim() || "Newest";
      console.log(`Fetched ${videos.length} videos from home page`);
      return {
        videos: videos,
        total: parseInt($(".total_results").text()?.match(/\(?([\d,]+)\)?/)?.[1]?.replace(/,/g, "") || "0"),
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
      const path = `/search/${encodeURIComponent(query)}`;
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
      $("#custom_list_videos_videos_list_search_items .item.thumb").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.th");
        const title = $link.attr("title") || $el.find(".thumb_title").text()?.trim() || "No title";
        const url = $link.attr("href") || "";
        const $img = $el.find("img.thumb");
        const thumbnail = $img.attr("data-original") || $img.attr("data-webp") || "";
        const preview = $el.find(".img.wrap_image").attr("data-preview") || "";
        const duration = $el.find(".time").text()?.trim() || "0:00";
        const added = $el.find(".added").text()?.trim().replace(/\s+/g, " ") || "Unknown";
        const ratingText = $el.find(".rating").text()?.trim() || "";
        const ratingMatch = ratingText.match(/(\d+)%\s*\((\d+)\)/);
        const rating = ratingMatch ? `${ratingMatch[1]}%` : "0%";
        const ratingCount = ratingMatch ? parseInt(ratingMatch[2]) : 0;
        const views = $el.find(".views").text()?.trim().replace(/\s+/g, " ") || "0";
        const quality = $el.find(".quality .custom-hd").length ? "HD" : "SD";
        const hasSound = !!$el.find(".sound").length;
        const futa = !!$el.find(".futa").length;
        const videoId = url.match(/\/video\/(\d+)/)?.[1] || "";
        videos.push({
          title: title,
          url: url,
          thumbnail: thumbnail,
          preview: preview,
          duration: duration,
          added: added,
          rating: rating,
          ratingCount: ratingCount,
          views: views,
          quality: quality,
          hasSound: hasSound,
          futa: futa,
          videoId: videoId
        });
      });
      $("#custom_list_videos_videos_list_search_sort_list a.btn").each((_, el) => {
        const $el = $(el);
        const sortName = $el.text()?.trim() || "";
        const sortBy = $el.attr("data-parameters")?.match(/sort_by:(\w+)/)?.[1] || "";
        const isActive = $el.hasClass("active");
        filters.sortOptions.push({
          name: sortName,
          value: sortBy,
          isActive: isActive
        });
      });
      const durationFilter = $("#filter_duration");
      filters.durationRange.min = parseInt(durationFilter.attr("data-min") || "0");
      filters.durationRange.max = parseInt(durationFilter.attr("data-max") || "3600");
      $(".filters-group--verified .filters-group__controls a.btn").each((_, el) => {
        const $el = $(el);
        const name = $el.text()?.trim() || "";
        const flag = $el.attr("data-flag2") || "";
        const isActive = $el.hasClass("active");
        filters.verifiedUploaders.push({
          name: name,
          flag: flag,
          isActive: isActive
        });
      });
      const titleEl = $(".headline .title");
      const titleText = titleEl.clone().children().remove().end().text().trim();
      const searchQuery = titleText.replace("Videos for:", "").trim() || query;
      console.log(`Found ${videos.length} videos for query: ${query}`);
      return {
        videos: videos,
        total: parseInt($(".total_results").text()?.match(/\(?([\d,]+)\)?/)?.[1]?.replace(/,/g, "") || "0"),
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
      const title = $("title").text()?.trim() || "No title";
      const description = $('meta[name="description"]').attr("content")?.trim() || "No description";
      const keywords = $('meta[name="keywords"]').attr("content")?.split(",").map(k => k.trim()).filter(Boolean) || [];
      const thumbnail = $('link[rel="apple-touch-icon"]').attr("href") || $('link[rel="icon"]').attr("href") || "";
      const jsonLdScript = $('script[type="application/ld+json"]').html();
      let structuredData = {};
      if (jsonLdScript) {
        try {
          structuredData = JSON.parse(jsonLdScript);
        } catch (e) {
          console.error("Error parsing JSON-LD:", e.message);
        }
      }
      const structuredName = structuredData?.name?.trim() || "";
      const structuredDescription = structuredData?.description?.trim() || "";
      const structuredThumbnail = structuredData?.thumbnailUrl || "";
      const structuredUploadDate = structuredData?.uploadDate || "Unknown";
      const structuredDuration = structuredData?.duration?.replace("PT", "").replace("H", ":").replace("M", ":").replace("S", "") || "0:00";
      const structuredContentUrl = structuredData?.contentUrl || "";
      const interactionStats = structuredData?.interactionStatistic || [];
      const watchAction = interactionStats.find(stat => stat.interactionType?.includes("WatchAction"));
      const likeAction = interactionStats.find(stat => stat.interactionType?.includes("LikeAction"));
      const structuredViews = watchAction?.userInteractionCount?.toString() || "0";
      const structuredLikes = likeAction?.userInteractionCount?.toString() || "0";
      const videoUrls = [];
      $(".row.row_spacer .wrap .tag_item").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";
        if (href.includes("get_file")) {
          const text = $el.text()?.trim() || "";
          const quality = text.match(/(MP4\s+)?(\d+p)/i)?.[2] || "Unknown";
          const bitrate = href.match(/br=(\d+)/)?.[1] || "0";
          const downloadFilename = href.match(/download_filename=([^&]+)/)?.[1]?.replace(/%20/g, " ").replace(/\+/g, " ") || "";
          videoUrls.push({
            quality: quality,
            url: href,
            bitrate: bitrate,
            downloadFilename: downloadFilename
          });
        }
      });
      const tags = [];
      $(".row.tags .tag_item").each((_, el) => {
        const $el = $(el);
        const tag = $el.text()?.trim();
        if (tag) tags.push(tag);
      });
      const videoId = $('input[name="video_id"]').attr("value") || "";
      const hasSound = !!$(".sound .custom-sound").length;
      const futa = !!$(".futa").length;
      const favicon32 = $('link[rel="icon"][sizes="32x32"]').attr("href") || "";
      const favicon16 = $('link[rel="icon"][sizes="16x16"]').attr("href") || "";
      const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr("href") || "";
      const msApplicationTileColor = $('meta[name="msapplication-TileColor"]').attr("content") || "";
      const themeColor = $('meta[name="theme-color"]').attr("content") || "";
      const manifest = $('link[rel="manifest"]').attr("href") || "";
      console.log(`Fetched details for ${title}`);
      return {
        title: structuredName || title,
        description: structuredDescription || description,
        keywords: keywords,
        thumbnail: structuredThumbnail || thumbnail,
        uploadDate: structuredUploadDate,
        duration: structuredDuration,
        views: structuredViews,
        likes: structuredLikes,
        videoUrls: videoUrls,
        tags: tags,
        videoId: videoId,
        contentUrl: structuredContentUrl,
        hasSound: hasSound,
        futa: futa,
        favicon32: favicon32,
        favicon16: favicon16,
        appleTouchIcon: appleTouchIcon,
        msApplicationTileColor: msApplicationTileColor,
        themeColor: themeColor,
        manifest: manifest
      };
    } catch (error) {
      console.error(`Error fetching details for ${url}:`, error.message);
      return {
        title: "",
        description: "",
        keywords: [],
        thumbnail: "",
        uploadDate: "",
        duration: "",
        views: "0",
        likes: "0",
        videoUrls: [],
        tags: [],
        videoId: "",
        contentUrl: "",
        hasSound: false,
        futa: false,
        favicon32: "",
        favicon16: "",
        appleTouchIcon: "",
        msApplicationTileColor: "",
        themeColor: "",
        manifest: ""
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
  const api = new Rule34Scraper();
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
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'detail', dan 'home'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}