import axios from "axios";
import * as cheerio from "cheerio";
class KiryuuSearch {
  constructor() {
    this.baseURL = "https://kiryuu.one/?s=";
  }
  async search(query) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}${encodeURIComponent(query)}`);
      const $ = cheerio.load(data);
      return $(".bsx").map((_, el) => {
        const element = $(el);
        const title = element.find("a").attr("title")?.trim();
        const url = element.find("a").attr("href");
        const image = element.find("img").attr("src");
        const chapter = element.find(".epxs").text().trim();
        const rating = element.find(".numscore").text().trim();
        return title && url ? {
          title: title,
          url: url,
          image: image,
          chapter: chapter,
          rating: rating
        } : null;
      }).get().filter(Boolean);
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return [];
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      return {
        title: $(".seriestuheader .entry-title").text().trim(),
        altTitle: $(".seriestualt").text().trim(),
        description: $(".entry-content.entry-content-single").text().trim(),
        status: $('.infotable tr:contains("Status") td').text().trim().replace("Status", ""),
        type: $('.infotable tr:contains("Type") td').text().trim().replace("Type", ""),
        released: $('.infotable tr:contains("Released") td').text().trim().replace("Released", ""),
        author: $('.infotable tr:contains("Author") td').text().trim().replace("Author", ""),
        updatedOn: $('.infotable tr:contains("Updated On") td time').attr("datetime"),
        rating: $(".rating .num").text().trim(),
        image: $(".thumb img").attr("src"),
        chapters: $("#chapterlist .chbox").map((_, el) => ({
          num: $(el).find(".chapternum").text().trim(),
          dateL: $(el).find(".chapterdate").text().trim(),
          link: $(el).find(".eph-num a").attr("href"),
          dl: $(el).find(".dload").attr("href")
        })).get()
      };
    } catch (error) {
      console.error("Error fetching manga data:", error);
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
  const kiryuu = new KiryuuSearch();
  switch (action) {
    case "search":
      if (!query) {
        return res.status(400).json({
          message: "Query parameter is required"
        });
      }
      const searchResults = await kiryuu.search(query);
      return res.status(200).json(searchResults);
    case "detail":
      if (!url) {
        return res.status(400).json({
          message: "URL parameter is required"
        });
      }
      const mangaDetail = await kiryuu.detail(url);
      return mangaDetail ? res.status(200).json(mangaDetail) : res.status(404).json({
        message: "Manga not found"
      });
    default:
      return res.status(400).json({
        message: "Invalid action"
      });
  }
}