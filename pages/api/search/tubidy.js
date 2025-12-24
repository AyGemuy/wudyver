import axios from "axios";
import * as cheerio from "cheerio";
class TubidyScraper {
  constructor() {
    this.baseURL = "https://tubidy.cool";
  }
  fixUrl(url) {
    return !url ? "" : url.startsWith("//") ? `https:${url}` : url.startsWith("http") ? url : `${this.baseURL}${url}`;
  }
  async search(query) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/search.php?q=${encodeURIComponent(query)}`);
      const $ = cheerio.load(data);
      const results = $(".list-container .media").map((_, el) => ({
        title: $(el).find(".media-body a").first().text().trim(),
        duration: $(el).find(".video-search-footer li").first().text().replace("Duration: ", "").trim(),
        thumbnail: this.fixUrl($(el).find(".media-left img").attr("src")),
        link: this.fixUrl($(el).find(".media-body a").first().attr("href"))
      })).get();
      console.log("Search Results:", results);
      return results;
    } catch (error) {
      console.log("Search Error:", error);
      return [];
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(this.fixUrl(url));
      const $ = cheerio.load(data);
      const title = $(".video-title-selected").text().replace(/\n/g, " ").trim() || "No Title";
      const duration = $(".video-title-selected span").text().replace(/[()]/g, "").trim() || "0:00";
      const thumbnail = this.fixUrl($(".donwload-box .text-center img").attr("src"));
      const downloadLinks = $(".list-group-item a").map((_, el) => this.fixUrl($(el).attr("href"))).get();
      const downloads = [];
      for await (const link of downloadLinks) {
        const data = await this.fetchDownload(link);
        if (data) downloads.push(...data);
      }
      const result = {
        title: title,
        duration: duration,
        thumbnail: thumbnail,
        media: downloads.filter((v, i, arr) => arr.findIndex(x => x.link === v.link && v.size.includes("MB")) === i)
      };
      console.log("Detail Result:", result);
      return result;
    } catch (error) {
      console.log("Detail Error:", error);
      return {};
    }
  }
  async fetchDownload(url) {
    try {
      const {
        data
      } = await axios.get(this.fixUrl(url));
      const $ = cheerio.load(data);
      const downloads = $("#donwload_box .list-group-item.big a").map((_, el) => ({
        type: $(el).text().trim().split(" ").slice(1)[0].toLowerCase(),
        size: $(el).find(".mb-text").text().trim() || "Unknown",
        link: this.fixUrl($(el).attr("href"))
      })).get().filter((v, i, arr) => arr.findIndex(x => x.link === v.link && !v.link.includes("send")) === i);
      console.log("Fetch Download Result:", downloads);
      return downloads;
    } catch (error) {
      console.log("Fetch Download Error:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const tubidy = new TubidyScraper();
  try {
    switch (action) {
      case "search":
        if (query) {
          const searchResult = await tubidy.search(query);
          return res.status(200).json({
            result: searchResult
          });
        } else {
          return res.status(400).json({
            error: "Query is required for search"
          });
        }
      case "detail":
        if (url) {
          const detailResult = await tubidy.detail(url);
          return res.status(200).json({
            result: detailResult
          });
        } else {
          return res.status(400).json({
            error: "Url is required for search"
          });
        }
      case "random":
        if (query) {
          const randomSearch = await tubidy.search(query);
          const getRandomIndex = arr => Math.floor(Math.random() * arr.length);
          const randomIndex = getRandomIndex(randomSearch);
          const randomLink = randomSearch[randomIndex].link;
          const randomResult = await tubidy.detail(randomLink);
          return res.status(200).json({
            result: randomResult
          });
        } else {
          return res.status(400).json({
            error: "Query is required for random"
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}