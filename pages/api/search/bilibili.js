import axios from "axios";
import * as cheerio from "cheerio";
class BilibiliSearch {
  constructor() {}
  async search(query) {
    try {
      let {
        data: m
      } = await axios.get(`https://www.bilibili.tv/id/search-result?q=${encodeURIComponent(query)}`);
      let $ = cheerio.load(m);
      const results = [];
      $("li.section__list__item").each((index, element) => {
        const title = $(element).find(".highlights__text--active").text().trim();
        const videoLink = $(element).find(".bstar-video-card__cover-link").attr("href");
        const thumbnail = $(element).find(".bstar-video-card__cover-img source").attr("srcset");
        const views = $(element).find(".bstar-video-card__desc--normal").text().trim();
        const creatorName = $(element).find(".bstar-video-card__nickname").text().trim();
        const creatorLink = $(element).find(".bstar-video-card__nickname").attr("href");
        const duration = $(element).find(".bstar-video-card__cover-mask-text").text().trim();
        results.push({
          title: title,
          videoLink: `https://www.bilibili.tv${videoLink}`,
          thumbnail: thumbnail,
          views: views,
          creatorName: creatorName,
          creatorLink: `https://www.bilibili.tv${creatorLink}`,
          duration: duration
        });
      });
      return results;
    } catch (error) {
      console.error("Error while fetching search results:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Query parameter is required"
    });
  }
  try {
    const bilibiliSearch = new BilibiliSearch();
    const results = await bilibiliSearch.search(query);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch data from Bilibili"
    });
  }
}