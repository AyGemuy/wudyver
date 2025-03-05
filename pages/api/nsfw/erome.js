import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search(query) {
    try {
      const link = encodeURIComponent(`https://www.erome.com/search?q=${encodeURIComponent(query)}`);
      const {
        data: html
      } = await axios.get(`https://${process.env.DOMAIN_URL}/api/tools/web/html/v6?url=${link}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const albums = [];
      $(".album").each((i, element) => {
        const album = {
          title: $(element).find(".album-title").text().trim(),
          url: $(element).find(".album-title").attr("href"),
          user: $(element).find(".album-user").text().trim(),
          thumbnail: $(element).find(".album-thumbnail").data("src"),
          views: $(element).find(".album-bottom-views").text().trim()
        };
        albums.push(album);
      });
      if (albums.length === 0) {
        return {
          message: "No albums found for the query"
        };
      }
      return albums;
    } catch (error) {
      console.error("Error fetching data:", error.message || error);
      return {
        status: false,
        error: error.message || error
      };
    }
  }
  async detail(url) {
    try {
      const {
        data: html
      } = await axios.get(`https://${process.env.DOMAIN_URL}/api/tools/web/html/v6?url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      const $ = cheerio.load(html);
      const albumDetails = {
        title: $("h1").text().trim(),
        username: $("#user_name").text().trim(),
        userProfileImage: $("#user_icon img").attr("src"),
        userProfileLink: $("#user_name").attr("href"),
        videoCount: $(".album-videos").text().trim(),
        views: $(".fa-eye").parent().text().trim(),
        likes: $(".fa-heart").next("b").text().trim(),
        reposts: $(".album-repost b").text().trim(),
        videoUrl: $("video source").attr("src"),
        tags: [],
        mediaSize: 0
      };
      $("p.mt-10 a").each((i, tag) => {
        albumDetails.tags.push($(tag).text().trim());
      });
      if (!albumDetails.title) {
        return {
          message: "Album details could not be fetched. Please check the URL."
        };
      }
      return albumDetails;
    } catch (error) {
      console.error("Error fetching data:", error.message || error);
      return {
        status: false,
        error: error.message || error
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new Downloader();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await downloader.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await downloader.detail(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}