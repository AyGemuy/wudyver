import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor(options = {}) {
    this.client = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
      },
      ...options
    });
    console.log("LOG: Scraper instance has been initialized.");
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`LOG: Starting scraping process for URL: ${url}`);
    try {
      console.log("LOG: Fetching HTML content from the target URL...");
      const {
        data: html
      } = await this.client.get(url, {
        ...rest
      });
      console.log("LOG: HTML content fetched successfully.");
      console.log("LOG: Loading HTML into Cheerio for parsing...");
      const $ = cheerio.load(html);
      console.log("LOG: Extracting main data from #VideoObject script tag...");
      const videoObjectScript = $("#VideoObject").html();
      if (!videoObjectScript) {
        throw new Error("Could not find #VideoObject script tag. The page structure might have changed.");
      }
      const videoData = JSON.parse(videoObjectScript);
      console.log("LOG: Extracting navigation data from #BreadcrumbList script tag...");
      const breadcrumbScript = $("#BreadcrumbList").html();
      const breadcrumbData = breadcrumbScript ? JSON.parse(breadcrumbScript) : null;
      console.log("LOG: Extracting additional media URLs from active HTML tags...");
      console.log("LOG: Processing interaction statistics...");
      const videoStats = videoData.interactionStatistic?.reduce((acc, item) => {
        const type = item.interactionType?.["@type"]?.split("/").pop().replace("Action", "").toLowerCase() || "unknown";
        acc[type] = item.userInteractionCount ?? 0;
        return acc;
      }, {}) || {};
      const authorStats = videoData.creator?.mainEntity?.interactionStatistic?.reduce((acc, item) => {
        const type = item.interactionType?.["@type"]?.split("/").pop().replace("Action", "").toLowerCase() || "unknown";
        acc[type] = item.userInteractionCount ?? 0;
        return acc;
      }, {}) || {};
      console.log("LOG: Assembling the final structured result...");
      const result = {
        success: true,
        source: url,
        metadata: {
          type: videoData?.["@type"] || "VideoObject",
          title: videoData?.name || "No title available",
          description: $('meta[property="og:description"]').attr("content") || videoData?.description || "No description",
          duration: videoData?.duration || "PT0S",
          uploadDate: videoData?.uploadDate || null,
          dimensions: {
            width: videoData?.width ?? 0,
            height: videoData?.height ?? 0
          }
        },
        author: {
          type: videoData.creator?.mainEntity?.["@type"] || "Person",
          name: videoData.creator?.mainEntity?.name || "Unknown Author",
          username: videoData.creator?.mainEntity?.alternateName || "unknown_user",
          identifier: videoData.creator?.mainEntity?.identifier || null,
          description: videoData.creator?.mainEntity?.description || "",
          avatar: videoData.creator?.mainEntity?.image || "",
          url: videoData.creator?.mainEntity?.url || "",
          socialLinks: videoData.creator?.mainEntity?.sameAs || [],
          stats: {
            likesReceived: authorStats.like !== undefined ? authorStats.like : 0,
            followers: authorStats.follow !== undefined ? authorStats.follow : 0,
            posts: videoData.creator?.mainEntity?.agentInteractionStatistic?.[0]?.userInteractionCount ?? 0
          }
        },
        media: {
          video: {
            url: videoData?.contentUrl || alternateVideoUrl || ""
          },
          thumbnail: {
            urls: videoData?.thumbnailUrl || [],
            default: videoData?.thumbnailUrl?.[0] || posterUrl || ""
          }
        },
        audio: {
          type: videoData.audio?.["@type"] || "CreativeWork",
          name: videoData.audio?.name || "Original Audio",
          author: videoData.audio?.author || "Unknown Artist"
        },
        stats: {
          views: videoStats.watch !== undefined ? videoStats.watch : 0,
          likes: videoStats.like !== undefined ? videoStats.like : 0,
          shares: videoStats.share !== undefined ? videoStats.share : 0,
          comments: parseInt(videoData?.commentCount, 10) || 0
        },
        navigation: {
          type: breadcrumbData?.["@type"] || "BreadcrumbList",
          path: breadcrumbData?.itemListElement?.map(item => ({
            position: item.position,
            name: item.name,
            url: item.item
          })) || []
        }
      };
      console.log("LOG: Scraping process completed successfully!");
      return result;
    } catch (error) {
      console.error(`LOG: An error occurred: ${error.message}`);
      return {
        success: false,
        source: url,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new Downloader();
    const response = await client.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}