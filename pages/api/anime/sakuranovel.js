import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class SakuraNovel {
  constructor() {
    this.baseUrl = "https://sakuranovel.id";
    this.corsUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      Referer: "https://sakuranovel.id/",
      Origin: "https://sakuranovel.id",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      Priority: "u=0, i"
    };
  }
  async req(url, method = "GET", data = null) {
    try {
      const target = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
      const finalUrl = `${this.corsUrl}${target}`;
      console.log(`[LOG] Fetching: ${target} (${method})`);
      const config = {
        method: method,
        url: finalUrl,
        headers: this.headers,
        timeout: 6e4
      };
      if (method === "POST" && data) {
        config.data = qs.stringify(data);
        config.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
        config.headers["X-Requested-With"] = "XMLHttpRequest";
      }
      const response = await axios(config);
      return cheerio.load(response.data);
    } catch (error) {
      console.error(`[ERROR] Request Failed [${url}]: ${error.message}`);
      throw new Error(`Failed to fetch ${url}`);
    }
  }
  async home() {
    try {
      const $ = await this.req("/");
      const result = {
        popular: [],
        latest: []
      };
      $(".flexbox-item").each((i, el) => {
        const title = $(el).find(".flexbox-title").text()?.trim();
        if (!title) return;
        result.popular.push({
          title: title,
          url: $(el).find("a").attr("href") || null,
          cover: $(el).find("img").attr("src")?.split("?")[0] || null,
          rank: $(el).find(".flexbox-number").text()?.trim() || null
        });
      });
      $(".flexbox3-item").each((i, el) => {
        const title = $(el).find(".title a").text()?.trim();
        const latestChapEl = $(el).find(".chapter li").first();
        if (!title) return;
        result.latest.push({
          title: title,
          url: $(el).find(".flexbox3-thumb img").parent().parent().attr("href") || null,
          cover: $(el).find(".flexbox3-thumb img").attr("src")?.split("?")[0] || null,
          latest_chapter: {
            title: latestChapEl.find("a").text()?.trim() || "Unknown",
            url: latestChapEl.find("a").attr("href") || null,
            release: latestChapEl.find(".date").text()?.trim() || ""
          }
        });
      });
      console.log(`[LOG] Home: Found ${result.latest.length} updates.`);
      return result;
    } catch (error) {
      console.error("[ERROR] Home:", error.message);
      return {};
    }
  }
  async search({
    keyword,
    limit = 5,
    detail = false
  }) {
    try {
      if (!keyword) throw new Error("Keyword is required");
      const $ = await this.req("/wp-admin/admin-ajax.php", "POST", {
        action: "data_fetch",
        keyword: keyword
      });
      let results = [];
      $(".searchbox").each((i, el) => {
        const title = $(el).find(".searchbox-title").text()?.trim();
        const link = $(el).find("a").attr("href");
        if (link) {
          results.push({
            title: title || "Unknown",
            url: link,
            cover: $(el).find(".searchbox-thumb img").attr("src")?.split("?")[0] || null,
            type: $(el).find(".type").text()?.trim() || null,
            status: $(el).find(".status").text()?.trim() || null
          });
        }
      });
      results = results.slice(0, limit);
      console.log(`[LOG] Search: Found ${results.length} items (Limit: ${limit}). Fetching details: ${detail}`);
      if (detail && results.length > 0) {
        for (const item of results) {
          try {
            console.log(`[LOG] Auto-fetching detail for: ${item.title}`);
            const detailData = await this.detail({
              url: item.url
            });
            Object.assign(item, detailData);
          } catch (err) {
            console.warn(`[WARN] Failed getting detail for ${item.title}: ${err.message}`);
            item.error = "Failed to fetch full details";
          }
        }
      }
      return results;
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return [];
    }
  }
  async detail({
    url
  }) {
    try {
      const $ = await this.req(url);
      const title = $(".series-titlex h2").text()?.trim();
      if (!title) throw new Error("Novel not found or invalid page structure");
      const metaInfo = {
        description: $('meta[name="description"]').attr("content") || "",
        keywords: $('meta[name="keywords"]').attr("content") || "",
        og_image: $('meta[property="og:image"]').attr("content") || "",
        og_type: $('meta[property="og:type"]').attr("content") || "",
        updated_time: $('meta[property="og:updated_time"]').attr("content") || ""
      };
      let schemaData = {};
      try {
        const jsonLd = $('script[type="application/ld+json"].rank-math-schema').html();
        if (jsonLd) {
          const parsed = JSON.parse(jsonLd);
          const graph = parsed["@graph"] || [];
          const webPage = graph.find(g => g["@type"] === "WebPage" || g["@type"] === "BlogPosting");
          if (webPage) {
            schemaData = {
              datePublished: webPage.datePublished,
              dateModified: webPage.dateModified,
              inLanguage: webPage.inLanguage
            };
          }
        }
      } catch (e) {}
      const infoList = {};
      $(".series-infolist li").each((i, el) => {
        const key = $(el).find("b").text()?.replace(/:/g, "").trim();
        const valEl = $(el).clone();
        valEl.find("b").remove();
        const value = valEl.text()?.trim();
        if (key) infoList[key.toLowerCase()] = value;
      });
      const genres = $(".series-genres a").map((i, el) => $(el).text()?.trim()).get();
      const tags = $('.series-infolist li:contains("Tags") a').map((i, el) => $(el).text()?.trim()).get();
      const chapters = $(".series-chapterlists li").map((i, el) => {
        const a = $(el).find(".flexch-infoz a");
        const rawTitle = a.find("span").first().text();
        const cleanTitle = rawTitle?.replace(/\s+/g, " ").replace(/ Bahasa Indonesia$/i, "").trim();
        return {
          title: cleanTitle || "No Title",
          url: a.attr("href") || null,
          date: $(el).find(".date").text()?.trim() || ""
        };
      }).get();
      const data = {
        title: title,
        alt_title: $(".series-titlex span").text()?.trim() || "",
        cover: metaInfo.og_image || $(".series-thumb img").attr("src") || null,
        synopsis: $(".series-synops").text()?.trim() || metaInfo.description,
        metadata: {
          type: $(".series-infoz.block .type").text()?.trim() || "N/A",
          status: $(".series-infoz.block .status").text()?.trim() || "N/A",
          rating: $('.series-infoz.score span[itemprop="ratingValue"]').text()?.trim() || "0",
          bookmarks: $(".favcount span").text()?.trim() || "0",
          country: infoList.country || "Unknown",
          published: infoList.published || "Unknown",
          author: infoList.author || "Unknown",
          last_updated: metaInfo.updated_time || schemaData.dateModified || "Unknown"
        },
        genres: genres,
        tags: tags,
        chapters_count: chapters.length,
        chapters: chapters
      };
      console.log(`[LOG] Detail Success: ${data.title}`);
      return data;
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      throw error;
    }
  }
  async chapter({
    url
  }) {
    try {
      const $ = await this.req(url);
      const titleRaw = $(".title-chapter").text()?.trim();
      if (!titleRaw) throw new Error("Chapter content not found");
      const chapterInfo = titleRaw.replace(/ Bahasa Indonesia$/i, "");
      const contentArea = $(".tldariinggrissendiribrojangancopy");
      const images = contentArea.find("img").map((i, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("srcset");
        return src?.split(" ")[0]?.split("?")[0] || null;
      }).get().filter(Boolean);
      const textLines = contentArea.find("p").map((i, el) => {
        const text = $(el).text()?.trim();
        if (!text) return null;
        if (text.includes("Baca novel lain") || text.includes("sakuranovel")) return null;
        return text;
      }).get();
      const navigation = {
        prev: $(".pagi-prev a").attr("href") || null,
        toc: $(".pagi-toc a").attr("href") || null,
        next: $(".pagi-next a").attr("href") || null
      };
      const data = {
        title: chapterInfo,
        full_title: titleRaw,
        content_text: textLines.join("\n\n"),
        has_images: images.length > 0,
        images: images,
        navigation: navigation
      };
      console.log(`[LOG] Chapter Success: ${data.title}`);
      return data;
    } catch (error) {
      console.error("[ERROR] Chapter:", error.message);
      throw error;
    }
  }
  async genres() {
    try {
      const $ = await this.req("/genre/");
      const genres = $(".achlist li a").map((i, el) => ({
        name: $(el).contents().filter((_, t) => t.type === "text").text()?.trim(),
        count: $(el).find("span").text()?.trim() || "0",
        url: $(el).attr("href")
      })).get();
      console.log(`[LOG] Fetched ${genres.length} genres`);
      return genres;
    } catch (error) {
      console.error("[ERROR] Genres:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "chapter", "genres", "novel_list"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/sakuranovel?action=search&query=isekai"
      }
    });
  }
  const api = new SakuraNovel();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "https://sakuranovel.id/series/judul-novel/"
          });
        }
        response = await api.detail(params);
        break;
      case "chapter":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'chapter'.",
            example: "https://sakuranovel.id/judul-chapter-bahasa-indonesia/"
          });
        }
        response = await api.chapter(params);
        break;
      case "genres":
        response = await api.genres();
        break;
      case "novel_list":
        response = await api.novelList();
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}