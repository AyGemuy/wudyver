import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class NontonAnime {
  constructor() {
    this.baseUrl = "https://s4.nontonanimeid.boats/";
    this.proxyUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v8`;
    this.axiosInstance = axios.create({
      baseURL: "https://s4.nontonanimeid.boats/",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        referer: "https://s4.nontonanimeid.boats/"
      }
    });
  }
  async _fetch(url, options = {}) {
    const fetchUrl = this.proxyUrl ? `${this.proxyUrl}?url=${encodeURIComponent(url)}` : url;
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      referer: "https://s4.nontonanimeid.boats/",
      ...options.headers
    };
    try {
      const response = await this.axiosInstance.get(fetchUrl, {
        headers: headers,
        ...options
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async _post(url, body, options = {}) {
    const fetchUrl = this.proxyUrl ? `${this.proxyUrl}?url=${encodeURIComponent(url)}` : url;
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://s4.nontonanimeid.boats",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://s4.nontonanimeid.boats/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-arch": '""',
      "sec-ch-ua-bitness": '""',
      "sec-ch-ua-full-version": '"131.0.6778.99"',
      "sec-ch-ua-full-version-list": '"Chromium";v="131.0.6778.99", "Not_A Brand";v="24.0.0.0", "Microsoft Edge Simulate";v="131.0.6778.99", "Lemur";v="131.0.6778.99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-model": '"RMX3890"',
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua-platform-version": '"14.0.0"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      ...options.headers
    };
    try {
      const response = await this.axiosInstance.post(fetchUrl, body, {
        headers: headers,
        ...options
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async search({
    query = ""
  }) {
    try {
      const html = await this._fetch(`${this.baseUrl}?s=${encodeURIComponent(query)}`);
      return this.parseSearchResults(html);
    } catch (error) {
      throw error;
    }
  }
  parseSearchResults(html) {
    const $ = cheerio.load(html);
    return $(".result .archive .as-anime-grid a.as-anime-card").get().map(el => {
      const $el = $(el);
      return {
        link: $el.attr("href") || "#",
        thumbnail: $el.find(".as-card-thumbnail img").attr("src") || "",
        title: $el.find(".as-anime-title").text().trim() || "No Title",
        rating: $el.find(".as-rating").text().trim().split(" ")[1] || "N/A",
        type: $el.find(".as-type").text().trim().split(" ")[1] || "N/A",
        season: $el.find(".as-season").text().trim().replace(/[\n\t]/g, "").split(" ")[1] || "N/A",
        synopsis: $el.find(".as-synopsis").text().trim() || "No Synopsis",
        genres: $el.find(".as-genres .as-genre-tag").get().map(em => $(em).text().trim())
      };
    });
  }
  async detail({
    url = ""
  }) {
    try {
      const html = await this._fetch(url);
      return this.parseAnimeDetail(html);
    } catch (error) {
      throw error;
    }
  }
  parseAnimeDetail(html) {
    const $ = cheerio.load(html);
    const animeCard = $(".anime-card");
    const episodeListSection = $(".anime-card__episode-list-section");
    return {
      thumbnail: animeCard.find(".anime-card__sidebar img").attr("src") || "",
      score: animeCard.find(".anime-card__score .value").text().trim() || "N/A",
      type: animeCard.find(".anime-card__score .type").text().trim() || "N/A",
      trailerUrl: animeCard.find(".anime-card__sidebar .rt a.trailerbutton").attr("href") || "#",
      englishTitle: animeCard.find('.anime-card__main .details-list li:has(strong.title-label:contains("English:"))').text().replace("English:", "").trim() || "",
      synonyms: animeCard.find('.anime-card__main .details-list li:has(strong.title-label:contains("Synonyms:"))').text().replace("Synonyms:", "").trim() || "",
      studios: animeCard.find('.anime-card__main .details-list li:has(span.detail-label:contains("Studios:"))').text().replace("Studios:", "").trim() || "",
      duration: animeCard.find('.anime-card__main .details-list li:has(span.detail-label:contains("Duration:"))').text().replace("Duration:", "").trim() || "",
      popularity: animeCard.find('.anime-card__main .details-list li:has(span.detail-label:contains("Popularity:"))').text().replace("Popularity:", "").trim() || "",
      members: animeCard.find('.anime-card__main .details-list li:has(span.detail-label:contains("Members:"))').text().replace("Members:", "").trim() || "",
      aired: animeCard.find('.anime-card__main .details-list li:has(span.detail-label:contains("Aired:"))').text().replace("Aired:", "").trim() || "",
      genres: animeCard.find(".anime-card__main .anime-card__genres.in-tab a.genre-tag").get().map(el => $(el).text().trim()),
      synopsis: animeCard.find(".anime-card__main .tab-content#tab-synopsis .synopsis-prose p").text().trim() || "No Synopsis",
      status: animeCard.find(".anime-card__quick-info span.status-finish").text().trim() || "",
      totalEpisodes: animeCard.find('.anime-card__quick-info span:contains("Episodes")').text().trim().split(" ")[0] || "",
      ratingAge: animeCard.find('.anime-card__quick-info span:contains("PG-")').text().trim() || "",
      premiered: animeCard.find(".anime-card__quick-info span.season a").text().trim() || "",
      firstEpisodeLink: animeCard.find(".anime-card__meta .meta-episodes .first a").attr("href") || "#",
      lastEpisodeLink: animeCard.find(".anime-card__meta .meta-episodes .last a").attr("href") || "#",
      updatedAt: animeCard.find(".anime-card__meta .meta-update-info .date").text().trim() || "",
      updatedBy: animeCard.find(".anime-card__meta .meta-update-info .author").text().trim() || "",
      episodes: episodeListSection.find(".episode-list-items a.episode-item").get().map(el => ({
        link: $(el).attr("href") || "#",
        title: $(el).find(".ep-title").text().trim() || "No Title",
        date: $(el).find(".ep-date").text().trim() || ""
      }))
    };
  }
  async download({
    url: episodeUrl
  }) {
    try {
      const pageHtml = await this._fetch(episodeUrl);
      const nonce = this.parseNonce(pageHtml);
      if (!nonce) return null;
      const downloadInfo = this.parseDownloadInfo(pageHtml);
      const embedUrlsArray = await downloadInfo.videoServers.reduce(async (accPromise, server) => {
        const acc = await accPromise;
        let embedUrl = await this.fetchEmbedUrl(server.post, server.nume, server.serverName, nonce, episodeUrl);
        embedUrl && embedUrl.startsWith("//") ? embedUrl = "https:" + embedUrl : null;
        embedUrl && acc.push({
          name: server.serverName,
          url: embedUrl
        });
        return acc;
      }, Promise.resolve([]));
      return {
        ...downloadInfo,
        embedUrls: embedUrlsArray
      };
    } catch (error) {
      return null;
    }
  }
  parseNonce(html) {
    const scriptSrc = cheerio.load(html)("#ajax_video-js-extra").attr("src");
    const base64Match = scriptSrc && /base64,([a-zA-Z0-9+/=]+)/.exec(scriptSrc);
    if (!base64Match) return null;
    try {
      const decoded = Buffer.from(base64Match[1], "base64").toString("utf-8");
      const start = decoded.indexOf('"nonce":"');
      const end = start !== -1 ? decoded.indexOf('"', start + 9) : -1;
      return end !== -1 ? decoded.substring(start + 9, end) : null;
    } catch (error) {
      return null;
    }
  }
  parseDownloadInfo(html) {
    const $ = cheerio.load(html);
    const videoServers = $("#video-content .container1 .tabs1.player li.tab-link").get().map(el => {
      const $el = $(el);
      return {
        serverName: $el.find("span").text().trim() || "Unknown",
        playerId: $el.attr("id") || "",
        post: $el.attr("data-post") || "",
        type: $el.attr("data-type") || "",
        nume: $el.attr("data-nume") || "",
        isActive: $el.hasClass("on") || $el.hasClass("current1")
      };
    });
    const downloadLinks = $("#download_area .listlink a").get().map(el => {
      const $el = $(el);
      return {
        format: $el.prev().text().trim() || "Unknown",
        link: $el.attr("href") || "#",
        server: $el.text().trim() || "Lokal"
      };
    });
    const episodeTitle = $("#download_area h2.name").text().trim() || "No Title";
    return {
      episodeTitle: episodeTitle,
      videoServers: videoServers,
      downloadLinks: downloadLinks
    };
  }
  async fetchEmbedUrl(post, nume, serverName, nonce, episodeUrl) {
    const urlParts = episodeUrl.split("/");
    const slug = urlParts[urlParts.length - 2];
    const referer = `${episodeUrl}${slug}`;
    const targetUrl = "/wp-admin/admin-ajax.php";
    try {
      const response = await this.axiosInstance.post(targetUrl, new URLSearchParams({
        action: "player_ajax",
        nonce: nonce,
        serverName: serverName,
        nume: nume,
        post: post
      }), {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://s4.nontonanimeid.boats",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: referer,
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-arch": '""',
          "sec-ch-ua-bitness": '""',
          "sec-ch-ua-full-version": '"131.0.6778.99"',
          "sec-ch-ua-full-version-list": '"Chromium";v="131.0.6778.99", "Not_A Brand";v="24.0.0.0", "Microsoft Edge Simulate";v="131.0.6778.99", "Lemur";v="131.0.6778.99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-model": '"RMX3890"',
          "sec-ch-ua-platform": '"Android"',
          "sec-ch-ua-platform-version": '"14.0.0"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const $ = cheerio.load(response.data);
      const iframeSrc = $("iframe").attr("src");
      return iframeSrc || null;
    } catch (error) {
      console.error(`Error fetching embed URL for server ${serverName}:`, error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    switch (action) {
      case "search":
        if (!query) throw {
          code: 400,
          error: "Query parameter is required"
        };
        return res.json(await new NontonAnime().search({
          query: query
        }));
      case "detail":
        if (!url) throw {
          code: 400,
          error: "URL parameter is required"
        };
        return res.json(await new NontonAnime().detail({
          url: url
        }));
      case "download":
        if (!slug) throw {
          code: 400,
          error: "Slug parameter is required"
        };
        return res.json(await new NontonAnime().download({
          url: url
        }));
      default:
        throw {
          code: 400,
            error: "Invalid action"
        };
    }
  } catch (error) {
    return res.status(error.code || 500).json({
      status: false,
      error: error.error || "Internal Server Error"
    });
  }
}