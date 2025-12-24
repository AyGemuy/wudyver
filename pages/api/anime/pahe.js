import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class MovieSearch {
  constructor() {
    this.client = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.baseUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }
  async search(query) {
    try {
      const url = `${this.baseUrl}https://pahe.ink/?s=${encodeURIComponent(query)}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      return $(".timeline-post").map((i, el) => ({
        date: $(el).find(".timeline-date").text().trim() || "No date",
        title: $(el).find(".post-box-title a").text().trim() || "No title",
        link: $(el).find(".post-box-title a").attr("href") || "#",
        description: $(el).find(".entry p").text().trim() || "No description",
        image: $(el).find(".post-thumbnail img").attr("src") || "No image"
      })).get();
    } catch (error) {
      console.error("Error during search:", error);
      return [];
    }
  }
  async detail(inputUrl) {
    try {
      const url = `${this.baseUrl}${encodeURIComponent(inputUrl)}`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      return {
        name: $('h1.name.post-title.entry-title span[itemprop="name"]').text().trim() || "No name",
        date: $(".tie-date").first().text().trim() || "No date",
        categories: $(".post-cats a").map((i, el) => $(el).text().trim()).get() || [],
        comments: $(".post-comments a").text().trim() || "No comments",
        imdbLink: $(".imdbwp__link").attr("href") || "#",
        rating: $(".imdbwp__star").text().trim() || "No rating",
        metascore: $(".imdbwp__metascore").text().trim() || "No metascore",
        description: $(".imdbwp__teaser").text().trim() || "No description",
        actors: $(".imdbwp__footer span").text().trim() || "No actors",
        fileDetails: $(".entry code").html() || "No file details",
        download: $(".post-tabs-ver .box.download a").map((i, el) => ({
          link: $(el).attr("href") || "#",
          label: $(el).text().trim() || "No label"
        })).get() || []
      };
    } catch (error) {
      console.error("Error during detail fetch:", error);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    const movieSearch = new MovieSearch();
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: 'Query parameter "query" is required.'
          });
        }
        result = await movieSearch.search(query);
        break;
      case "detail":
        if (!url) {
          return res.status(400).json({
            error: 'Query parameter "url" is required.'
          });
        }
        result = await movieSearch.detail(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action."
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}