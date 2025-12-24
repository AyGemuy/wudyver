import axios from "axios";
import * as cheerio from "cheerio";
class FontScraper {
  constructor() {
    this.url = "https://www.1001fonts.com/search.html";
  }
  async search({
    query = "",
    page
  }) {
    const fullUrl = `${this.url}?search=${encodeURIComponent(query)}${page ? `&page=${page}` : ""}`;
    const {
      data
    } = await axios.get(fullUrl);
    const $ = cheerio.load(data);
    return $("#typeface-browsing-list .font-list-item").get().map(el => {
      const em = $(el);
      return {
        name: em.find("h6").contents().eq(0).text().trim(),
        author: em.find("h6 small a").text().trim(),
        authorUrl: "https://www.1001fonts.com" + (em.find("h6 small a").attr("href") || ""),
        detailUrl: "https://www.1001fonts.com" + (em.find(".preview-link").attr("href") || ""),
        downloadUrl: "https://www.1001fonts.com" + (em.find(".fa-arrow-down").closest("a").attr("href") || ""),
        imageUrl: "https:" + (em.find('source[type="image/png"]').attr("srcset") || "")
      };
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const fonts = new FontScraper();
    const response = await fonts.search(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}