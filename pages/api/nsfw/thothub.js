import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class ThothubScraper {
  constructor() {
    this.baseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1`;
  }
  async search({
    query,
    limit = 5
  }) {
    try {
      const targetUrl = `https://thothub.to/search/${encodeURIComponent(query)}/`;
      const response = await axios.get(this.baseUrl, {
        params: {
          url: targetUrl
        }
      });
      const $ = cheerio.load(response.data);
      const videos = $("#list_videos_videos_list_search_result_items .item:not(.private)").map((index, el) => {
        if (limit && index >= limit) return null;
        const $el = $(el);
        return {
          link: $el.find("a").attr("href") || "N/A",
          title: $el.find("strong.title").text().trim() || "No Title",
          thumbnail: $el.find("img.thumb").attr("data-original") || "N/A",
          duration: $el.find(".views-counter2").text().trim() || "N/A",
          views: $el.find(".views-counter").text().trim() || "N/A"
        };
      }).get();
      return videos;
    } catch (error) {
      console.error("Error fetching data from Thothub:", error);
      return [];
    }
  }
  async detail({
    url
  }) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          url: url
        }
      });
      const $ = cheerio.load(response.data);
      const scriptContent = $("script").filter((i, el) => $(el).html().includes("kt_player('kt_player',")).html();
      if (!scriptContent) {
        console.error("Tidak dapat menemukan script flashvars.");
        return null;
      }
      const getFlashvar = key => {
        const match = scriptContent.match(new RegExp(`${key}:\\s*'([^']*)'`));
        return match ? match[1] : "N/A";
      };
      const categoriesString = getFlashvar("video_categories");
      const tagsString = getFlashvar("video_tags");
      const videoSource = getFlashvar("video_url").replace(/^function\/0\//, "");
      return {
        title: $(".video-info h1").text().trim() || $('meta[property="og:title"]').attr("content") || "N/A",
        url: videoSource,
        duration: $(".info-holder .item span:nth-child(1) em").text().trim() || "N/A",
        views: $(".info-holder .item span:nth-child(2) em").text().trim() || "N/A",
        submitted: $(".info-holder .item span:nth-child(3) em").text().trim() || "N/A",
        description: $('.info-holder .item:contains("Description:") em').text().trim() || $('meta[name="description"]').attr("content") || "N/A",
        categories: categoriesString === "N/A" ? [] : categoriesString.split(",").map(c => c.trim()),
        tags: tagsString === "N/A" ? [] : tagsString.split(",").map(t => t.trim())
      };
    } catch (error) {
      console.error("Error fetching video details:", error);
      return null;
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
      error: "Missing required field: action",
      required: {
        action: "search | detail"
      }
    });
  }
  const thothub = new ThothubScraper();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await thothub.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await thothub.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | detail`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}