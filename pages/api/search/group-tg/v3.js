import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
const BASE_URL_TGSTAT = "https://tgstat.com";
const BASE_URL_SEARCH = "https://tgstat.com/en/channels/global-search";
const BASE_URL_DETAIL = `${BASE_URL_TGSTAT}/channel/`;
const createTelegramUrl = id => {
  return id.startsWith("@") ? `https://t.me/${id.substring(1)}` : `https://t.me/joinchat/${id}`;
};
class TgStatScraper {
  constructor() {
    this.log = msg => console.log(`[TgStatScraper] ${msg}`);
    this.axios = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://tgstat.com",
        Referer: "https://tgstat.com/",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*"
      },
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 303,
      timeout: 1e4
    });
  }
  async fetchData(url, method = "GET", data = null, contentType = "application/x-www-form-urlencoded") {
    const fullUrl = `${proxy}${url}`;
    this.log(`Fetching ${method} ${url}`);
    try {
      const res = await this.axios({
        method: method,
        url: fullUrl,
        data: data,
        headers: {
          "Content-Type": contentType || this.axios.defaults.headers["Content-Type"]
        }
      });
      const status = res.status ?? 500;
      if (status !== 200) {
        this.log(`Received unexpected status code: ${status} for ${url}`);
        return res.data || {
          error: true,
          message: `Status code ${status}`
        };
      }
      return res.data;
    } catch (error) {
      this.log(`Error fetching ${url}: ${error.message || "Unknown Error"}`);
      const errorMessage = error.response?.status ? `Status Code ${error.response.status}` : error.message || "Network Error";
      throw new Error(`Failed to fetch data for ${url}: ${errorMessage}`);
    }
  }
  async search({
    query,
    limit = 5,
    detail = true,
    ...rest
  }) {
    this.log(`Starting search for "${query}" (Limit: ${limit})`);
    const result = {
      query: query || "",
      limit: limit,
      results: [],
      ...rest
    };
    try {
      const formData = new URLSearchParams({
        query: query
      });
      const data = await this.fetchData(BASE_URL_SEARCH, "POST", formData);
      const html = data?.html || "";
      if (!html) {
        this.log("No HTML content received from search result.");
        return result;
      }
      const $ = cheerio.load(html);
      const rawResults = $('div.dropdown-item:has(.media-body a[href*="/channel/"])');
      let count = 0;
      for (const el of rawResults) {
        if (count >= limit) break;
        const $el = $(el);
        const linkEl = $el.find(".media-body a");
        const tgstatLink = linkEl.attr("href") || "N/A";
        const idMatch = tgstatLink.match(/\/channel\/(.+?)(?:\/stat|$)/);
        const id = idMatch?.[1] || tgstatLink.match(/@(.+?)(?:\/stat|$)/)?.[1] || "Unknown ID";
        const telegramLink = createTelegramUrl(id);
        const iconUrl = $el.find(".my-1.mr-1 img").attr("src");
        const icon = iconUrl?.startsWith("//") ? `https:${iconUrl}`.replace("_100", "_0") : iconUrl || "No Icon";
        const subscribersText = $el.find("small.text-muted b").text()?.trim() || "N/A";
        const subscribersNum = (() => {
          const cleanText = subscribersText.replace(/[^\d.]/g, "");
          const num = parseFloat(cleanText);
          if (subscribersText.includes("k")) return Math.round(num * 1e3);
          if (subscribersText.includes("m")) return Math.round(num * 1e6);
          return parseInt(cleanText, 10) || 0;
        })();
        const item = {
          type: "channel",
          name: linkEl.find("h5.text-dark").text()?.trim() || "Unknown Channel",
          id: id,
          username: id.startsWith("@") ? id.substring(1) : null,
          tgstat_link: tgstatLink,
          telegram_link: telegramLink,
          icon: icon,
          subscribers: subscribersText,
          subscribers_num: subscribersNum
        };
        if (detail) {
          this.log(`Fetching detail (recursive) for ${item.name} (${item.id})`);
          item.detail = await this.det({
            id: item.id,
            ...item
          });
        }
        result.results.push(item);
        count++;
      }
      this.log(`Search complete. ${result.results.length} results returned.`);
      return result;
    } catch (error) {
      this.log(`Search failed: ${error.message}`);
      return {
        ...result,
        error: error.message || "Failed to perform search (CORS/Network error)"
      };
    }
  }
  async det({
    id,
    ...rest
  }) {
    this.log(`Fetching detail for ID: ${id}`);
    const result = {
      id: id,
      ...rest,
      posts: []
    };
    const url = `${BASE_URL_DETAIL}${id}`;
    try {
      const html = await this.fetchData(url);
      const $ = cheerio.load(typeof html === "object" && html?.html ? html.html : html);
      result.name = $("h1.text-dark").text()?.trim() || $('meta[property="og:title"]').attr("content")?.split("—")?.[0]?.trim() || "N/A";
      result.description = $("p.card-text.mt-3").text()?.trim() || $('meta[property="og:description"]').attr("content")?.trim() || "No description provided.";
      result.is_private = $("a.btn-outline-info").text()?.includes("private") || false;
      const iconUrl = $("img.img-thumbnail.box-160-280").attr("src");
      result.icon_full = iconUrl?.startsWith("//") ? `https:${iconUrl}` : iconUrl || "N/A";
      const categoryEl = $('div.mt-2:has(h5:contains("Category")) a').first();
      result.category = categoryEl.text()?.trim() || "N/A";
      const subCountText = $(".card-body h2.mb-1.text-dark").first().text()?.trim() || result.subscribers || "N/A";
      result.subscribers = subCountText;
      const postElements = $("div.posts-list .post-container:not(.lm-controls-container)");
      let postCount = 0;
      for (const postEl of postElements) {
        if (postCount >= 5) break;
        const $post = $(postEl);
        const postId = $post.attr("id")?.replace("post-", "") || "Unknown";
        const relativeLink = $post.find('a[data-original-title*="Permanent post link"]').attr("href");
        const post = {
          id: postId,
          date: $post.find('small:contains(", ")').text()?.trim() || "N/A",
          text: $post.find(".post-text").map((i, el) => $(el).text().trim()).get().join("\n").replace(/\n{2,}/g, "\n").trim() || "No post text",
          views: $post.find('a[data-original-title*="views"]').text()?.replace(/[^0-9.k]/gi, "") || "0",
          shares: $post.find('span[data-original-title*="Total shares"]').text()?.replace(/[^0-9.k]/gi, "") || "0",
          reactions_count: $post.find('span[data-original-title*="reactions"]').text()?.replace(/[^0-9.k]/gi, "") || "0",
          link: relativeLink ? `${BASE_URL_TGSTAT}${relativeLink}` : "N/A",
          reactions_detail: []
        };
        const reactionData = $post.find('span[data-original-title*="reactions"]').attr("data-original-title");
        if (reactionData) {
          const reactionMatches = [...reactionData.matchAll(/<div>(.+?) - (\d+?)<\/div>/g)];
          post.reactions_detail = reactionMatches.map(match => ({
            emoji: match[1]?.trim(),
            count: parseInt(match[2] || "0", 10)
          }));
        }
        result.posts.push(post);
        postCount++;
      }
      this.log(`Detail fetch complete for ID: ${id}`);
      delete result.stat_summary;
      return result;
    } catch (error) {
      this.log(`Detail fetch failed for ID: ${id}: ${error.message}`);
      return {
        ...result,
        error: error.message || "Failed to fetch detail"
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
  const tgstatScraper = new TgStatScraper();
  try {
    const search_response = await tgstatScraper.search(params);
    return res.status(200).json(search_response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}