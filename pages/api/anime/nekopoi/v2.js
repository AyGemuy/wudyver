import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class NekoPoi {
  constructor() {
    this.baseURL = "https://m.nekopoi.bond";
    this.proxy = proxy;
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      referer: this.baseURL + "/",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    };
  }
  cleanText(str) {
    return str?.replace(/\n/g, " ")?.replace(/\s+/g, " ")?.trim() || "";
  }
  formatUrl(url) {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return `https:${url}`;
    return `${this.baseURL}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  decodeBase64(str) {
    try {
      return Buffer.from(str, "base64").toString("utf-8");
    } catch (e) {
      return null;
    }
  }
  extractDeepUrl(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url, this.baseURL);
      const encoded = urlObj.searchParams.get("url");
      if (encoded) {
        return this.decodeBase64(encoded);
      }
      return this.formatUrl(url);
    } catch (e) {
      return url;
    }
  }
  async fetchHtml(url, customHeaders = {}) {
    const targetUrl = this.formatUrl(url);
    const finalUrl = `${this.proxy}${targetUrl}`;
    try {
      const {
        data
      } = await axios.get(finalUrl, {
        headers: {
          ...this.headers,
          ...customHeaders
        }
      });
      return data;
    } catch (error) {
      console.error(`[ERROR] Fetch Fail: ${error.message}`);
      return null;
    }
  }
  parseGridItem($, el) {
    const $el = $(el);
    const metaSpans = $el.find(".flex.justify-between").last().find("span");
    return {
      title: this.cleanText($el.find("h2").text()),
      url: this.formatUrl($el.find("a").attr("href")),
      thumb: this.formatUrl($el.find("img").attr("data-src") || $el.find("img").attr("src")),
      type: this.cleanText($el.find(".absolute.top-1.left-1").text()) || "N/A",
      status: this.cleanText($el.find(".absolute.bottom-0").text()) || "N/A",
      episode_info: this.cleanText(metaSpans.eq(0).text()),
      year: this.cleanText(metaSpans.eq(1).text())
    };
  }
  async home() {
    try {
      const html = await this.fetchHtml("/home");
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const result = {
        latest_episodes: [],
        latest_series: [],
        sidebar: {
          tahun_ini: [],
          uncensored: []
        }
      };
      $("main > div:nth-child(1) article").each((i, el) => {
        const $el = $(el);
        result.latest_episodes.push({
          title: this.cleanText($el.find("h2").text()),
          url: this.formatUrl($el.find("a").attr("href")),
          thumb: this.formatUrl($el.find("img").attr("data-src") || $el.find("img").attr("src")),
          episode: this.cleanText($el.find(".absolute.top-1.left-1").text()),
          quality: this.cleanText($el.find(".absolute.top-1.right-1").text()),
          upload_date: this.cleanText($el.find(".time-ago").text())
        });
      });
      $("main > div:nth-child(2) article").each((i, el) => {
        result.latest_series.push(this.parseGridItem($, el));
      });
      const [yearData, uncensoredData] = await Promise.all([axios.get(`${this.proxy}${this.baseURL}/api/tahun-ini`, {
        headers: this.headers
      }).catch(() => ({
        data: []
      })), axios.get(`${this.proxy}${this.baseURL}/api/genre/uncensored`, {
        headers: this.headers
      }).catch(() => ({
        data: []
      }))]);
      result.sidebar.tahun_ini = (yearData.data || []).map(item => ({
        title: item.title,
        url: this.formatUrl(`/anime/${item.pageSlug}`),
        thumb: item.imageUrl,
        genres: item.genres
      }));
      result.sidebar.uncensored = (uncensoredData.data || []).map(item => ({
        title: item.title,
        url: this.formatUrl(`/anime/${item.pageSlug}`),
        thumb: item.imageUrl,
        genres: item.genres
      }));
      return {
        status: true,
        data: result
      };
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async search({
    query,
    limit = 10,
    detail = false
  }) {
    try {
      if (!query) throw new Error("Param 'query' required");
      const html = await this.fetchHtml(`/search?q=${encodeURIComponent(query)}`);
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const list = [];
      const articles = $("article.group").toArray();
      for (let i = 0; i < Math.min(articles.length, limit); i++) {
        const item = this.parseGridItem($, articles[i]);
        if (detail && item.url) {
          console.log(`[LOG] Fetching detail for: ${item.title}`);
          const detailInfo = await this.detail({
            url: item.url
          });
          if (detailInfo.status) item.details = detailInfo.data;
        }
        list.push(item);
      }
      return {
        status: true,
        total: list.length,
        data: list
      };
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async detail({
    url
  }) {
    try {
      if (!url) throw new Error("Param 'url' required");
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const info = {};
      $("table tr").each((i, el) => {
        const key = $(el).find("th").text().replace(":", "").trim().toLowerCase().replace(/\s/g, "_");
        let val = $(el).find("td").text().trim();
        if (key === "genre") val = $(el).find("td a").map((_, a) => $(a).text().trim()).get();
        if (key) info[key] = val;
      });
      const episodes = [];
      $(".p-5 .grid a[href*='/anime/']").each((i, el) => {
        const href = $(el).attr("href");
        if (href && href.split("/").filter(Boolean).length >= 3) {
          episodes.push({
            title: $(el).attr("title") || this.cleanText($(el).text()),
            url: this.formatUrl(href),
            ep_num: $(el).text().trim()
          });
        }
      });
      return {
        status: true,
        data: {
          title: this.cleanText($("header h1").text()),
          anime_id: $("#favorit1").attr("data-animeid"),
          thumb: this.formatUrl($(".w-full.rounded-md.shadow-lg").attr("src")),
          synopsis: this.cleanText($("p.text-muted.leading-relaxed").first().text()),
          admin: this.cleanText($("header span").first().text()),
          date: this.cleanText($("header span").last().text()),
          metadata: info,
          episode_list: episodes
        }
      };
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async watch({
    url
  }) {
    try {
      if (!url) throw new Error("Param 'url' required");
      const html = await this.fetchHtml(url);
      if (!html) throw new Error("Empty HTML");
      const $ = cheerio.load(html);
      const embedData = $("#pembed").attr("data-default");
      let playUrl = null;
      if (embedData) {
        const decodedIframe = this.decodeBase64(embedData);
        const iframeSrc = decodedIframe?.match(/src="([^"]+)"/)?.[1];
        if (iframeSrc) {
          playUrl = this.extractDeepUrl(iframeSrc);
        }
      }
      const downloads = [];
      $(".bg-darker.p-4.rounded").each((i, el) => {
        const server = $(el).find("span.bg-primary").first().text().trim();
        $(el).find("a").each((j, a) => {
          const rawLink = $(a).attr("href");
          downloads.push({
            server: server || "Download",
            quality: $(a).text().trim(),
            original_url: this.formatUrl(rawLink),
            decoded_url: this.extractDeepUrl(rawLink)
          });
        });
      });
      return {
        status: true,
        data: {
          title: this.cleanText($("header h1").text()),
          play_url: playUrl,
          downloads: downloads,
          navigation: {
            prev: this.formatUrl($("a:contains('Prev')").attr("href")),
            next: this.formatUrl($("a:contains('Next')").attr("href")),
            index: this.formatUrl($("a:contains('Semua')").attr("href"))
          },
          synopsis: this.cleanText($(".p-5 .flex-1 p.text-muted").first().text()),
          keywords: this.cleanText($("p.text-muted").last().text())
        }
      };
    } catch (error) {
      return {
        status: false,
        message: error.message
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
      error: "Paramenter 'action' wajib diisi.",
      actions: ["home", "search", "detail", "watch"]
    });
  }
  const api = new NekoPoi();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "watch":
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib diisi untuk action 'watch'."
          });
        }
        response = await api.watch(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          actions: ["home", "search", "detail", "watch"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}