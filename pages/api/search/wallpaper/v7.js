import axios from "axios";
import * as cheerio from "cheerio";
export default async function handler(req, res) {
  const {
    query,
    page = 1
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required"
    });
  }
  try {
    const url = `https://wallpapers.com/search/${encodeURIComponent(query)}?p=${page}`;
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const baseUrl = "https://wallpapers.com";
    const results = $(".content-card").map((_, el) => {
      const image = $(el).find("img").attr("data-src");
      if (!image) return null;
      return {
        title: $(el).find("figure").attr("data-title") || "",
        link: $(el).find("a").attr("href") || "",
        image: `${baseUrl}${image}`,
        description: $(el).find("figure").attr("data-desc") || ""
      };
    }).get().filter(item => item);
    return res.status(200).json({
      result: results
    });
  } catch (e) {
    console.error("Failed to fetch wallpapers:", e.message);
    res.status(500).json({
      error: "Failed to fetch wallpapers"
    });
  }
}