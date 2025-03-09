import axios from "axios";
import * as cheerio from "cheerio";
class Scraper {
  async search(query, limit = 10) {
    try {
      const {
        data
      } = await axios.get(`https://www.grouplinker.site/search/${encodeURIComponent(query)}`);
      const $ = cheerio.load(data);
      return $(".custom-media > div").map((_, el) => ({
        name: $(el).find("h3").text().trim() || null,
        image: $(el).find("img").attr("src") || null,
        link: $(el).find("a").attr("href") || null
      })).get().slice(0, limit);
    } catch (error) {
      console.error("Scraping error:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      query = "meme",
        limit = 10
    } = req.method === "GET" ? req.query : req.body;
    if (!query) return res.status(400).json({
      error: "Query is required"
    });
    const scraper = new Scraper();
    const results = await scraper.search(query, Number(limit));
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}