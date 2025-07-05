import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class ScraperClass {
  async html(url) {
    try {
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=${encodeURIComponent(url)}`);
      return cheerio.load(data);
    } catch {
      return null;
    }
  }
  async search(query) {
    const $ = await this.html(`https://music.apple.com/id/search?term=${encodeURIComponent(query)}`);
    if (!$) return [];
    return $(".grid-item").map((_, el) => {
      const title = $(el).find('[data-testid="top-search-result-title"] span').text().trim();
      const subtitle = $(el).find('[data-testid="top-search-result-subtitle"]').text().trim();
      const link = $(el).find('[data-testid="click-action"]').attr("href");
      const imgSrc = $(el).find('[data-testid="artwork-component"] source').first().attr("srcset") || "";
      return link ? {
        title: title,
        subtitle: subtitle,
        link: link,
        imgSrc: imgSrc
      } : null;
    }).get();
  }
  async track(url) {
    const $ = await this.html(url);
    if (!$) return [];
    return $('section[data-testid="shelf-component"] li.shelf-grid__list-item').map((_, el) => {
      const title = $(el).find('[data-testid="track-lockup-title"] a').text().trim();
      const explicit = $(el).find('[data-testid="explicit-badge"]').length > 0;
      const album = $(el).find('[data-testid="track-lockup-subtitle"] span').text().trim();
      const artwork = $(el).find('[data-testid="artwork-component"] picture source').first().attr("srcset")?.split(" ")[0];
      const link = $(el).find('[data-testid="track-lockup-title"] a').attr("href");
      return link ? {
        title: title,
        explicit: explicit,
        album: album,
        artwork: artwork,
        link: link
      } : null;
    }).get();
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      query,
      url
    } = req.query;
    let result = [];
    const Scraper = new ScraperClass();
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query parameter is required"
        });
        result = await Scraper.search(query);
        break;
      case "tracks":
        if (!url) return res.status(400).json({
          error: "URL parameter is required"
        });
        result = await Scraper.track(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}