import axios from "axios";
import * as cheerio from "cheerio";
class InfotourneyScraper {
  constructor() {
    this.baseUrl = "https://infotourney.com";
    this.defaultHeaders = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async fetchAndParse(url, headers = {}) {
    try {
      const response = await axios.get(url, {
        headers: {
          ...this.defaultHeaders,
          ...headers
        }
      });
      const $ = cheerio.load(response.data);
      const menu = this.parseMenu($);
      return {
        $: $,
        menu: menu
      };
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error.message);
      throw error;
    }
  }
  parseMenu($) {
    return $("ul.nav.menu > li").map((i, el) => ({
      title: $(el).find("a").first().text()?.trim() || "",
      url: this.formatUrl($(el).find("a").first().attr("href")),
      children: $(el).find("ul.nav-child li").map((i, child) => ({
        title: $(child).find("a").text()?.trim() || "",
        url: this.formatUrl($(child).find("a").attr("href")),
        type: "submenu_item"
      })).get(),
      type: "menu_item"
    })).get();
  }
  formatUrl(url) {
    return url?.startsWith("http") ? url : url ? `${this.baseUrl}${url}` : null;
  }
  cleanContent(content) {
    return content?.replace(/You need JavaScript enabled to view it\./g, "")?.replace(/document\.getElementById\(.*?\).*?;/g, "")?.replace(/\s+/g, " ")?.trim() || "";
  }
  async getMenu() {
    try {
      const url = `${this.baseUrl}/`;
      const {
        menu
      } = await this.fetchAndParse(url, {
        Referer: `${this.baseUrl}/`
      });
      return {
        success: true,
        menu: menu || []
      };
    } catch (error) {
      console.error("Menu failed:", error.message);
      return {
        success: false,
        error: error.message,
        menu: [],
        type: "menu_error"
      };
    }
  }
  async search(params = {}) {
    try {
      const {
        query: searchword = "mobile legend",
        ordering = "newest",
        phrase: searchphrase = "all",
        limit = 20,
        ...rest
      } = params;
      const searchParams = new URLSearchParams({
        searchword: searchword,
        ordering: ordering,
        searchphrase: searchphrase,
        limit: limit,
        ...rest
      });
      const url = `${this.baseUrl}/component/search/?${searchParams.toString()}`;
      const {
        $,
        menu
      } = await this.fetchAndParse(url, {
        Referer: `${this.baseUrl}/component/search/?searchword=${encodeURIComponent(searchword)}&searchphrase=all&Itemid=619`
      });
      const results = $("dl.search-results dt.result-title").map((i, el) => ({
        number: parseInt($(el).text().trim().split(".")[0]) || i + 1,
        title: $(el).find("a").text()?.replace(/^\d+\.\s*/, "")?.trim() || "",
        url: this.formatUrl($(el).find("a").attr("href")),
        highlight: $(el).find("a span.highlight").map((i, span) => $(span).text()?.trim() || "").get() || [],
        category: $(el).next("dd.result-category").text()?.trim() || "",
        text: $(el).nextAll("dd.result-text").first().text()?.trim() || "",
        created: $(el).nextAll("dd.result-created").first().text()?.trim() || "",
        type: "search_result"
      })).get();
      return {
        success: true,
        data: results || [],
        menu: menu || [],
        meta: {
          count: results?.length || 0,
          searchParams: searchParams.toString(),
          url: url
        }
      };
    } catch (error) {
      console.error("Search failed:", error.message);
      return {
        success: false,
        error: error.message,
        menu: [],
        type: "search_error"
      };
    }
  }
  async list(params = {}) {
    try {
      const {
        game = "mobile-legends", ...rest
      } = params;
      const url = `${this.baseUrl}/tournament/${game}`;
      const {
        $,
        menu
      } = await this.fetchAndParse(url, {
        Referer: `${this.baseUrl}/component/search/?searchword=${encodeURIComponent(game)}&ordering=newest&searchphrase=all&limit=20`
      });
      const pageTitle = $("div.page-header h1").text()?.trim() || "";
      const tournaments = $("article.item").map((i, el) => ({
        title: $(el).find("h2 a").text()?.trim() || "",
        url: this.formatUrl($(el).find("h2 a").attr("href")),
        date: $(el).find("time").attr("datetime") || "",
        image: this.formatUrl($(el).find("img").attr("src")),
        imageAlt: $(el).find("img").attr("alt") || "",
        description: $(el).find("p").eq(0).text()?.trim() || "",
        readMore: this.formatUrl($(el).find("p.readmore a").attr("href")),
        tags: $(el).find(".tags a").map((i, tag) => ({
          name: $(tag).text()?.trim() || "",
          url: this.formatUrl($(tag).attr("href"))
        })).get() || [],
        type: "tournament_list_item"
      })).get();
      return {
        success: true,
        data: {
          pageTitle: pageTitle,
          tournaments: tournaments || [],
          pagination: this.parsePagination($)
        },
        menu: menu || [],
        meta: {
          count: tournaments?.length || 0,
          game: game,
          url: url,
          ...rest
        }
      };
    } catch (error) {
      console.error("List failed:", error.message);
      return {
        success: false,
        error: error.message,
        menu: [],
        type: "list_error"
      };
    }
  }
  async detail(params = {}) {
    try {
      const {
        url,
        ...rest
      } = params;
      if (!url) throw new Error("URL is required");
      const {
        $,
        menu
      } = await this.fetchAndParse(this.formatUrl(url), {
        Referer: `${this.baseUrl}/tournament/mobile-legends`
      });
      const articleBody = $('div[itemprop="articleBody"]');
      articleBody.find('script, span[id^="cloak"]').remove();
      const title = $("h1.page-header").text()?.trim() || "";
      const image = this.formatUrl(articleBody.find("img").attr("src"));
      const imageAlt = articleBody.find("img").attr("alt") || "";
      const description = articleBody.find("p").eq(0).text()?.trim() || "";
      const details = {};
      articleBody.find("strong").each((i, el) => {
        const key = $(el).text()?.trim()?.replace(":", "") || "";
        const value = $(el).nextUntil("strong").text()?.trim() || "";
        if (key) details[key] = value;
      });
      const paragraphs = articleBody.find("p").map((i, el) => $(el).text()?.trim() || "").get().filter(p => p);
      const contactInfo = {};
      articleBody.find("p").each((i, el) => {
        const text = $(el).text()?.trim() || "";
        if (text.includes("Contact Person")) {
          $(el).nextUntil("p").each((i, sibling) => {
            const contactText = $(sibling).text()?.trim() || "";
            if (contactText.includes("WA") || contactText.includes("WhatsApp")) {
              contactInfo.whatsapp = contactText.replace("WA:", "")?.trim();
            } else if (contactText.includes("Instagram")) {
              contactInfo.instagram = contactText.replace("Instagram:", "")?.trim();
            }
          });
        }
      });
      return {
        success: true,
        data: {
          title: title,
          image: image,
          imageAlt: imageAlt,
          description: description,
          details: details,
          paragraphs: paragraphs,
          contactInfo: contactInfo,
          fullContent: this.cleanContent(articleBody.text()),
          url: this.formatUrl(url),
          type: "tournament_detail"
        },
        menu: menu || [],
        meta: {
          url: url,
          ...rest
        }
      };
    } catch (error) {
      console.error("Detail failed:", error.message);
      return {
        success: false,
        error: error.message,
        menu: [],
        type: "detail_error",
        url: params.url
      };
    }
  }
  parsePagination($) {
    const pagination = $(".pagination li").map((i, el) => ({
      text: $(el).text()?.trim() || "",
      url: this.formatUrl($(el).find("a").attr("href")),
      isActive: $(el).hasClass("active"),
      isDisabled: $(el).hasClass("disabled")
    })).get();
    return pagination?.length > 0 ? pagination : null;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "search | list | detail | menu",
        examples: {
          search: {
            query: "mobile legend",
            limit: 20
          },
          list: {
            game: "mobile-legends"
          },
          detail: {
            url: "/tournament/mobile-legends/10578"
          },
          menu: {}
        }
      }
    });
  }
  const scraper = new InfotourneyScraper();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`,
            example: {
              query: "mobile legend",
              ordering: "newest",
              limit: 20
            }
          });
        }
        result = await scraper.search(params);
        break;
      case "list":
        if (!params.game) {
          return res.status(400).json({
            error: `Missing required field: game (required for ${action})`,
            example: {
              game: "mobile-legends",
              page: 1
            }
          });
        }
        result = await scraper.list(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`,
            example: {
              url: "/tournament/mobile-legends/10578-turnamen-mobile-legends-muffin-season-61-8"
            }
          });
        }
        result = await scraper.detail(params);
        break;
      case "menu":
        result = await scraper.getMenu();
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | list | detail | menu`
        });
    }
    return res.status(200).json({
      success: true,
      action: action,
      ...result
    });
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`,
      action: action,
      params: params
    });
  }
}