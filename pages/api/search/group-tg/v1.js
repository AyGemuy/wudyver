import axios from "axios";
import * as cheerio from "cheerio";
class TelegramSearchScraper {
  constructor() {
    this.base_url = "https://en.tgramsearch.com";
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async search({
    query,
    limit = 5,
    detail = true
  }) {
    try {
      const response = await axios.get(`${this.base_url}/search`, {
        params: {
          query: query
        },
        headers: {
          ...this.headers,
          Referer: `${this.base_url}/search?query=${encodeURIComponent(query)}`
        }
      });
      const $ = cheerio.load(response.data);
      const results = [];
      const channels = $(".tg-channel-wrapper:not(.is-ads)").slice(0, limit);
      for (const el of channels.get()) {
        const $el = $(el);
        const channel_data = {
          title: $el.find(".tg-channel-link a")?.text()?.trim() || "",
          image: $el.find(".tg-channel-img img")?.attr("src") || "",
          type: $el.find(".tg-options-public, .tg-options-private")?.text()?.trim() || "unknown",
          user_count: $el.find(".tg-user-count")?.text()?.trim() || "0",
          user_change: $el.find(".tg-user-change")?.text()?.trim() || "",
          description: $el.find(".tg-channel-description")?.text()?.trim() || "",
          join_url: $el.find(".tg-channel-link a")?.attr("href") || "",
          telegram_url: ""
        };
        const join_url_match = channel_data.join_url.match(/\/join\/(\d+)/);
        if (join_url_match) {
          channel_data.channel_id = join_url_match[1];
          if (detail) {
            const detail_data = await this.detail({
              id: channel_data.channel_id
            });
            channel_data.detail = detail_data;
            if (detail_data.telegram_url) {
              const tg_url_match = detail_data.telegram_url.match(/domain=([^&]+)/);
              if (tg_url_match) {
                channel_data.telegram_url = `https://t.me/${tg_url_match[1]}`;
              }
            }
          }
        }
        results.push(channel_data);
      }
      return {
        success: true,
        query: query,
        limit: limit,
        detail: detail,
        count: results.length,
        results: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        query: query,
        limit: limit,
        detail: detail,
        count: 0,
        results: []
      };
    }
  }
  async detail({
    id
  }) {
    try {
      const response = await axios.get(`${this.base_url}/join/${id}`, {
        headers: {
          ...this.headers,
          Referer: `${this.base_url}/search?query=anime`
        }
      });
      const $ = cheerio.load(response.data);
      const $channel = $(".tg-channel-wrapper:not(.is-ads)").first();
      if (!$channel.length) {
        return {
          error: "Channel not found"
        };
      }
      const detail_data = {
        title: $channel.find(".tg-channel-header a, .tg-channel-link a")?.text()?.trim() || "",
        image: $channel.find(".tg-channel-img img")?.attr("src") || "",
        alt: $channel.find(".tg-channel-img img")?.attr("alt") || "",
        type: $channel.find(".tg-options-public, .tg-options-private")?.text()?.trim() || "unknown",
        user_count: $channel.find(".tg-user-count")?.text()?.trim() || "0",
        user_change: $channel.find(".tg-user-change")?.text()?.trim() || "",
        user_change_type: $channel.find(".tg-user-change")?.hasClass("is-minus") ? "decrease" : $channel.find(".tg-user-change")?.hasClass("is-plus") ? "increase" : "neutral",
        description: $channel.find(".tg-channel-description")?.text()?.trim() || "",
        telegram_url: $channel.find(".tg-channel-more a, .tg-channel-header a")?.attr("href") || "",
        categories: []
      };
      if (detail_data.telegram_url) {
        const tg_url_match = detail_data.telegram_url.match(/domain=([^&]+)/);
        if (tg_url_match) {
          detail_data.t_me_url = `https://t.me/${tg_url_match[1]}`;
        }
      }
      $channel.find(".tg-channel-categories a").each((i, em) => {
        const category = $(em)?.text()?.trim()?.replace("#", "") || "";
        if (category) {
          detail_data.categories.push(category);
        }
      });
      const share_links = {};
      $(".ya-share2__item").each((i, em) => {
        const $em = $(em);
        const service = $em?.attr("class")?.match(/ya-share2__item_service_(\w+)/)?.[1];
        const url = $em.find("a")?.attr("href") || "";
        if (service && url) {
          share_links[service] = url;
        }
      });
      if (Object.keys(share_links).length > 0) {
        detail_data.share_links = share_links;
      }
      return detail_data;
    } catch (error) {
      return {
        error: error.message,
        channel_id: id
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (search or detail) is required."
    });
  }
  const telegramScraper = new TelegramSearchScraper();
  try {
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Query is required for 'search' action."
          });
        }
        const search_response = await telegramScraper.search(params);
        return res.status(200).json(search_response);
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "ID is required for 'detail' action."
          });
        }
        const detail_response = await telegramScraper.detail(params);
        return res.status(200).json(detail_response);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'search' and 'detail'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}