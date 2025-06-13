import axios from "axios";
import * as cheerio from "cheerio";
class FontScraper {
  constructor() {
    this.url = "https://font.download";
  }
  async search({
    query,
    page = ""
  }) {
    const searchUrl = `${this.url}/search/${query}/${page}`;
    try {
      const response = await axios.get(searchUrl);
      return response.status === 200 ? this.parseFonts(response.data) : [];
    } catch (error) {
      return [];
    }
  }
  parseFonts(html) {
    const $ = cheerio.load(html);
    return $("#font-list .font-list-item").map((index, element) => {
      const name = $(element).find(".title h5 a").text().trim() || "No Name";
      const link = $(element).find(".title h5 a").attr("href") || "";
      const description = $(element).find(".title p").text().trim() || "No description available";
      const image = $(element).find(".image img").attr("src") || "";
      const downloadLink = $(element).find(".btn-outline-primary").attr("href") || "";
      return {
        name: name,
        link: link,
        description: description,
        image: image,
        downloadLink: downloadLink
      };
    }).get();
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