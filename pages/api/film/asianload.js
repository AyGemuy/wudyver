import axios from "axios";
import * as cheerio from "cheerio";
class AsianloadScraper {
  constructor() {
    this.base_url = "https://asianload.cam";
    this.axios_instance = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
  }
  async search({
    query,
    limit = 3,
    detail = true
  }) {
    try {
      const search_url = `${this.base_url}/?type=movies&s=${encodeURIComponent(query)}`;
      const response = await this.axios_instance.get(search_url);
      const $ = cheerio.load(response.data);
      const items = $(".list-episode-item li").slice(0, limit).map((_, el) => {
        const $el = $(el);
        return {
          title: $el.find(".title").text().trim(),
          url: $el.find("a").attr("href"),
          image: $el.find("img").attr("data-original") || $el.find("img").attr("src")
        };
      }).get();
      if (!detail) return items;
      const results = [];
      for (const item of items) {
        const detail_data = await this.detail({
          url: item.url
        });
        results.push({
          ...item,
          detail: detail_data
        });
      }
      return results;
    } catch (error) {
      console.error("Error in search:", error.message);
      throw new Error(`Search failed: ${error.message}`);
    }
  }
  async detail({
    url
  }) {
    try {
      const response = await this.axios_instance.get(url);
      const $ = cheerio.load(response.data);
      const title = $(".series-info h1").text().trim();
      const image = $(".series-poster img").attr("src");
      const other_name = $('.series-info p:contains("Other Name")').text().replace("Other Name:", "").trim();
      const description = $(".series-description div").text().trim();
      const country = $('.series-meta p:contains("Country") a').text().trim();
      const status = $('.series-meta p:contains("Status") a').text().trim();
      const genres = $('.series-meta p:contains("Genre") a').map((_, el) => $(el).text().trim()).get();
      const episodes = $(".list-episode-item-2 li").map((_, el) => {
        const $el = $(el);
        return {
          title: $el.find(".title").text().trim(),
          url: $el.find("a").attr("href"),
          type: $el.find(".type").text().trim(),
          time: $el.find(".time").text().trim()
        };
      }).get();
      return {
        title: title,
        image: image,
        other_name: other_name,
        description: description,
        metadata: {
          country: country,
          status: status,
          genres: genres
        },
        episodes: episodes
      };
    } catch (error) {
      console.error("Error in detail:", error.message);
      throw new Error(`Failed to get detail: ${error.message}`);
    }
  }
  async episode({
    url
  }) {
    try {
      const response = await this.axios_instance.get(url);
      const $ = cheerio.load(response.data);
      const title = $(".episode-title").text().trim();
      const category = $(".category a").text().trim();
      const category_url = $(".category a").attr("href");
      const description = $(".block-watch").text().trim();
      const video_url = $(".watch-iframe iframe").attr("src");
      const servers = $(".anime_muti_link li").map((_, el) => {
        const $el = $(el);
        return {
          name: $el.text().split("\n")[0]?.trim(),
          video_url: $el.attr("data-video"),
          active: $el.hasClass("active")
        };
      }).get();
      const episode_options = $(".plugins2 select option").map((_, el) => {
        const $el = $(el);
        return {
          title: $el.text().trim(),
          url: $el.attr("value"),
          selected: $el.attr("selected") !== undefined
        };
      }).get();
      const prev_episode_url = $('.plugins2 a[rel="prev"]').attr("href");
      const next_episode_url = $('.plugins2 a[rel="next"]').attr("href");
      return {
        title: title,
        category: {
          name: category,
          url: category_url
        },
        description: description,
        video_url: video_url,
        servers: servers,
        episode_options: episode_options,
        navigation: {
          prev: prev_episode_url,
          next: next_episode_url
        }
      };
    } catch (error) {
      console.error("Error in episode:", error.message);
      throw new Error(`Failed to get episode: ${error.message}`);
    }
  }
  async download({
    url
  }) {
    try {
      const response = await this.axios_instance.get(url);
      const html = response.data;
      const $ = cheerio.load(html);
      const result = {
        video: null,
        image: null,
        file: null
      };
      const foundUrls = [];
      $("body script").each((i, el) => {
        const script = $(el).html() || "";
        let searchPos = 0;
        while (searchPos < script.length) {
          let pos = script.indexOf("aHR0cHM", searchPos);
          if (pos === -1) break;
          let end = pos;
          while (end < script.length && /[A-Za-z0-9+\/=]/.test(script[end])) {
            end++;
          }
          const base64 = script.substring(pos, end);
          if (base64.length >= 50) {
            try {
              const decoded = Buffer.from(base64, "base64").toString();
              if (decoded.startsWith("https://")) {
                foundUrls.push({
                  base64: base64,
                  decoded: decoded,
                  position: pos,
                  index: foundUrls.length
                });
                console.log(`Found URL [${foundUrls.length}]: ${decoded}`);
              }
            } catch (e) {}
          }
          searchPos = pos + 1;
        }
      });
      if (foundUrls.length >= 3) {
        result.file = foundUrls[0];
        result.image = foundUrls[1];
        result.video = foundUrls[2];
      } else if (foundUrls.length === 2) {
        result.file = foundUrls[0];
        result.image = foundUrls[1];
      } else if (foundUrls.length === 1) {
        result.file = foundUrls[0];
      }
      return result;
    } catch (error) {
      console.error("Error in download:", error.message);
      throw new Error(`Failed to get download links: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const scraper = new AsianloadScraper();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "query parameter is required for search"
          });
        }
        result = await scraper.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "url parameter is required for detail"
          });
        }
        result = await scraper.detail(params);
        break;
      case "episode":
        if (!params.url) {
          return res.status(400).json({
            error: "url parameter is required for episode"
          });
        }
        result = await scraper.episode(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: "url parameter is required for download"
          });
        }
        result = await scraper.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | detail | episode | download`
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "An error occurred",
      details: error.message
    });
  }
}