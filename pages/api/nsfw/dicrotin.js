import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class Scraper {
  config = {
    baseUrl: `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v13`,
    endpoint: {
      search: "?url=https://dicrotin.space/?s=",
      detail: "?url="
    }
  };
  async search({
    query,
    limit = 5,
    detail = false,
    ...rest
  }) {
    console.log(`Starting search with query: ${query}, limit: ${limit}, detail: ${detail}`);
    try {
      const url = `${this.config.baseUrl}${this.config.endpoint.search}${encodeURIComponent(query)}`;
      console.log(`Fetching search URL: ${url}`);
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const videos = $(".video-block.thumbs-rotation").slice(0, limit).map((i, el) => {
        const title = $(el).find(".title")?.text()?.trim() || "No title";
        const link = $(el).find("a.thumb")?.attr("href") || "";
        const duration = $(el).find(".duration")?.text()?.trim() || "Unknown";
        const views = $(el).find(".views-number")?.text()?.trim() || "0 views";
        const rating = $(el).find(".rating")?.text()?.trim() || "No rating";
        const thumbnail = $(el).find(".video-img")?.attr("data-src") || $(el).find(".video-img")?.attr("src") || "";
        return {
          title: title,
          link: link,
          duration: duration,
          views: views,
          rating: rating,
          thumbnail: thumbnail
        };
      }).get();
      console.log(`Found ${videos.length} videos`);
      if (detail) {
        console.log("Fetching detailed information for videos using for...of loop");
        const detailedVideos = [];
        for (const video of videos) {
          try {
            const details = await this.detail({
              url: video.link
            });
            detailedVideos.push({
              ...video,
              ...details
            });
          } catch (err) {
            console.error(`Error fetching details for ${video.link}: ${err.message}`);
            detailedVideos.push(video);
          }
        }
        return detailedVideos;
      }
      return videos;
    } catch (err) {
      console.error(`Search error: ${err.message}`);
      throw err;
    }
  }
  async detail({
    url,
    ...rest
  }) {
    console.log(`Fetching details for URL: ${url}`);
    try {
      const proxyUrl = `${this.config.baseUrl}${this.config.endpoint.detail}${encodeURIComponent(url)}`;
      console.log(`Using proxy URL: ${proxyUrl}`);
      const {
        data
      } = await axios.get(proxyUrl);
      const $ = cheerio.load(data);
      const title = $(".video-title h1")?.text()?.trim() || "No title";
      const description = $(".video-description p")?.text()?.trim() || "No description";
      const duration = $('meta[itemprop="duration"]')?.attr("content") || "Unknown";
      const thumbnail = $('meta[itemprop="thumbnailUrl"]')?.attr("content") || "";
      const embedUrl = $('meta[itemprop="embedURL"]')?.attr("content") || "";
      const uploadDate = $('meta[itemprop="uploadDate"]')?.attr("content") || "Unknown";
      const categories = $("#video-cats a").map((i, el) => $(el).text()?.trim()).get() || [];
      const tags = $("#video-tags a").map((i, el) => $(el).text()?.trim()).get() || [];
      const views = $("#video-views .views-number")?.text()?.trim() || "0 views";
      const rating = $(".rating-result .percentage")?.text()?.trim() || "No rating";
      const result = {
        title: title,
        description: description,
        duration: duration,
        thumbnail: thumbnail,
        embedUrl: embedUrl,
        uploadDate: uploadDate,
        categories: categories,
        tags: tags,
        views: views,
        rating: rating
      };
      console.log(`Successfully fetched details for ${url}`);
      return result;
    } catch (err) {
      console.error(`Detail error: ${err.message}`);
      throw err;
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
  const api = new Scraper();
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
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search' dan 'detail'.`
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