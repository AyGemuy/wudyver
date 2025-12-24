import axios from "axios";
import * as cheerio from "cheerio";
class AniwatchScraper {
  constructor() {
    this.config = {
      baseUrl: "https://ww2.aniwatch.fit",
      endpoint: "/"
    };
  }
  async search({
    query = "",
    ...rest
  }) {
    try {
      console.log(`Searching anime: ${query}`);
      const {
        data
      } = await axios.get(`${this.config.baseUrl}/?s=${encodeURIComponent(query)}`, {
        params: rest
      });
      const $ = cheerio.load(data);
      const results = [];
      $(".listupd article.bs").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a[itemprop='url']");
        const title = $link.attr("title") || "";
        const url = $link.attr("href") || "";
        const image = $el.find("img").attr("src") || "";
        const type = $el.find(".typez").text().trim() || "";
        const status = $el.find(".bt .epx").text().trim() || "";
        const subtitle = $el.find(".bt .sb").text().trim() || "";
        const isCompleted = !!$el.find(".status.Completed").length;
        results.push({
          title: title,
          url: url,
          image: image,
          type: type,
          status: status,
          subtitle: subtitle,
          isCompleted: isCompleted
        });
      });
      console.log(`Found ${results.length} anime for query: ${query}`);
      return {
        results: results,
        total: results.length,
        searchQuery: query
      };
    } catch (error) {
      console.error(`Error searching anime ${query}:`, error.message);
      return {
        results: [],
        total: 0,
        searchQuery: query
      };
    }
  }
  async detail({
    url = "",
    ...rest
  }) {
    try {
      console.log(`Fetching anime details: ${url}`);
      const fullUrl = url.startsWith("http") ? url : `${this.config.baseUrl}${url}`;
      const {
        data
      } = await axios.get(fullUrl, {
        params: rest
      });
      const $ = cheerio.load(data);
      const title = $("h1.entry-title").text().trim() || "";
      const alternateTitles = $(".alter").text().trim() || "";
      const image = $(".thumb img").attr("src") || "";
      const coverImage = $(".bigcover img").attr("src") || "";
      const rating = $(".rating strong").text().replace("Rating ", "").trim() || "";
      const trailer = $("a.trailerbutton").attr("href") || "";
      const followed = $(".bmc").text().replace("Followed ", "").replace(" people", "").trim() || "0";
      const info = {};
      $(".info-content .spe span").each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const match = text.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const key = match[1].toLowerCase().replace(/\s+/g, "_");
          const value = match[2].trim();
          info[key] = value;
        }
      });
      const genres = [];
      $(".genxed a").each((_, el) => {
        genres.push($(el).text().trim());
      });
      const synopsis = $(".bixbox.synp .entry-content").text().trim() || "";
      const characters = [];
      $(".cvlist .cvitem").each((_, el) => {
        const $el = $(el);
        const charName = $el.find(".cvchar .charname").text().trim() || "";
        const charRole = $el.find(".cvchar .charrole").text().trim() || "";
        const charImage = $el.find(".cvchar .cvcover img").attr("src") || "";
        const actorName = $el.find(".cvactor .charname a").text().trim() || "";
        const actorRole = $el.find(".cvactor .charrole").text().trim() || "";
        const actorImage = $el.find(".cvactor .cvcover img").attr("src") || "";
        characters.push({
          character: {
            name: charName,
            role: charRole,
            image: charImage
          },
          voiceActor: {
            name: actorName,
            language: actorRole,
            image: actorImage
          }
        });
      });
      const episodes = [];
      $(".eplister ul li").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a");
        const epNum = $el.find(".epl-num").text().trim() || "";
        const epTitle = $el.find(".epl-title").text().trim() || "";
        const epSubtitle = $el.find(".epl-sub").text().trim() || "";
        const epDate = $el.find(".epl-date").text().trim() || "";
        const epUrl = $link.attr("href") || "";
        episodes.push({
          episode: epNum,
          title: epTitle,
          subtitle: epSubtitle,
          date: epDate,
          url: epUrl
        });
      });
      console.log(`Fetched details for ${title}`);
      return {
        title: title,
        alternateTitles: alternateTitles,
        image: image,
        coverImage: coverImage,
        rating: rating,
        trailer: trailer,
        followed: followed,
        info: info,
        genres: genres,
        synopsis: synopsis,
        characters: characters,
        episodes: episodes,
        totalEpisodes: episodes.length
      };
    } catch (error) {
      console.error(`Error fetching anime details ${url}:`, error.message);
      return {
        title: "",
        alternateTitles: "",
        image: "",
        coverImage: "",
        rating: "",
        trailer: "",
        followed: "0",
        info: {},
        genres: [],
        synopsis: "",
        characters: [],
        episodes: [],
        totalEpisodes: 0
      };
    }
  }
  async download({
    url = "",
    ...rest
  }) {
    try {
      console.log(`Fetching download links: ${url}`);
      const fullUrl = url.startsWith("http") ? url : `${this.config.baseUrl}${url}`;
      const {
        data
      } = await axios.get(fullUrl, {
        params: rest
      });
      const $ = cheerio.load(data);
      const title = $("h1.entry-title").text().trim() || "";
      const episodeNum = title.match(/Episode\s+(\d+)/i)?.[1] || "";
      const thumbnail = $(".item.meta .tb img").attr("src") || "";
      const status = $(".item.meta .epx").text().trim() || "";
      const releaseDate = $(".item.meta .year .updated").text().trim() || "";
      const series = $(".item.meta .year a").text().trim() || "";
      const seriesUrl = $(".item.meta .year a").attr("href") || "";
      const servers = [];
      $(".mirror option").each((_, el) => {
        const $el = $(el);
        const value = $el.attr("value") || "";
        const name = $el.text().trim() || "";
        if (value && name !== "Select Video Server") {
          let iframeHtml = "";
          let videoUrl = "";
          try {
            iframeHtml = Buffer.from(value, "base64").toString("utf-8");
            const srcMatch = iframeHtml.match(/src="([^"]+)"/);
            if (srcMatch) {
              videoUrl = srcMatch[1];
            }
          } catch (e) {
            console.error("Error decoding iframe:", e.message);
          }
          servers.push({
            name: name,
            videoUrl: videoUrl,
            iframeHtml: iframeHtml
          });
        }
      });
      const navigation = {
        prev: $(".naveps .nvs a[rel='prev']").attr("href") || "",
        allEpisodes: $(".naveps .nvsc a").attr("href") || "",
        next: $(".naveps .nvs a[rel='next']").attr("href") || ""
      };
      const seriesInfo = {
        title: $(".single-info h2").text().trim() || "",
        alternateTitles: $(".single-info .alter").text().trim() || "",
        image: $(".single-info .thumb img").attr("src") || "",
        rating: $(".single-info .rating strong").text().replace("Rating ", "").trim() || "",
        genres: []
      };
      $(".single-info .genxed a").each((_, el) => {
        seriesInfo.genres.push($(el).text().trim());
      });
      console.log(`Fetched download data for ${title}`);
      return {
        title: title,
        episodeNum: episodeNum,
        thumbnail: thumbnail,
        status: status,
        releaseDate: releaseDate,
        series: series,
        seriesUrl: seriesUrl,
        servers: servers,
        navigation: navigation,
        seriesInfo: seriesInfo
      };
    } catch (error) {
      console.error(`Error fetching download links ${url}:`, error.message);
      return {
        title: "",
        episodeNum: "",
        thumbnail: "",
        status: "",
        releaseDate: "",
        series: "",
        seriesUrl: "",
        servers: [],
        navigation: {},
        seriesInfo: {}
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AniwatchScraper();
  try {
    let response;
    switch (action) {
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
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib diisi untuk action 'download'."
          });
        }
        response = await api.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'detail', dan 'download'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}