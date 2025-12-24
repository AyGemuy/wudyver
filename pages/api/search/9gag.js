import axios from "axios";
import * as cheerio from "cheerio";
class NineGag {
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      const $ = cheerio.load(data);
      const jsonData = {};
      $('script[type="application/ld+json"]').each((i, script) => {
        try {
          jsonData[i] = JSON.parse($(script).html());
        } catch (error) {}
      });
      return jsonData;
    } catch (error) {
      console.error("Error fetching or parsing detail:", error);
      return {};
    }
  }
  async search(query) {
    try {
      const {
        data
      } = await axios.get(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://9gag.com/v1/search-posts?query=${query}`)}`);
      return data || {};
    } catch (error) {
      console.error("Error fetching search results:", error);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const pageParser = new NineGag();
  const {
    query,
    url
  } = req.query;
  try {
    return url ? res.status(200).json(await pageParser.detail(url)) : query ? res.status(200).json(await pageParser.search(query)) : res.status(400).json({
      error: "Missing query or url parameter"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}