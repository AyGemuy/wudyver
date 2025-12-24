import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class TelegramChannelsScraper {
  constructor() {
    this.base_url = "https://telegramchannels.me";
    this.api_url = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1`;
  }
  async search({
    query,
    limit = 5
  }) {
    try {
      const search_url = `${this.base_url}/search?type=all&search=${encodeURIComponent(query)}`;
      const encoded_url = encodeURIComponent(search_url);
      const api_response = await axios.get(`${this.api_url}?url=${encoded_url}`);
      if (!api_response.data) {
        throw new Error("Failed to get HTML from API.");
      }
      const html = api_response.data;
      const $ = cheerio.load(html);
      const results = [];
      const items = $(".columns.is-multiline.masonry > .column").slice(0, limit);
      items.each((index, el) => {
        const $item = $(el);
        const cardContent = $item.find(".card.media-card");
        const title = cardContent.find(".card-content .two-line-text b").text().trim() || "";
        const description = cardContent.find(".content.has-text-grey.two-line-text p").text().trim() || "";
        const subscribersRaw = cardContent.find(".subtitle.is-size-7.mt-2.has-text-grey i.fa-bullhorn").parent().text().replace(/\s*\(.*\)\s*/g, "").trim() || "";
        const subscribers = subscribersRaw.split("\n")[0] || "";
        const avatarUrl = cardContent.find("figure.image.is-64x64 img").attr("src") || "";
        const telegramLink = cardContent.find('.card-label.is-size-7.has-text-grey a[href^="tg://"]').attr("href") || "";
        const siteLinkPartial = cardContent.find("a.has-text-grey-darker.two-line-text").attr("href") || "";
        const siteLink = `${siteLinkPartial}`;
        results.push({
          rank: index + 1,
          title: title,
          description: description,
          subscribers: subscribers,
          avatar_url: avatarUrl,
          telegram_link: telegramLink,
          site_link: siteLink
        });
      });
      return {
        success: true,
        query: query,
        limit: limit,
        count: results.length,
        results: results
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: error.message || "Internal Server Error",
        query: query,
        limit: limit,
        count: 0,
        results: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required."
    });
  }
  const scraper = new TelegramChannelsScraper();
  try {
    const search_response = await scraper.search(params);
    return res.status(200).json(search_response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}