import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
const HOST_MAP = {
  1: "kuramanime.com",
  2: "kuramanime.pro",
  3: "kuramanime.run",
  4: "kuramanime.tel"
};
class Kurama {
  constructor({
    host = 4
  } = {}) {
    this.setHost(host);
    this.proxy = proxy;
  }
  setHost(host) {
    const domain = HOST_MAP[host] || HOST_MAP[3];
    this.host = domain;
    this.baseUrl = `https://${domain}/anime`;
  }
  getHeaders() {
    return {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    };
  }
  async fetchHtml(url) {
    try {
      const proxyUrl = `${this.proxy}${url}`;
      const {
        data
      } = await axios.get(proxyUrl, {
        headers: this.getHeaders()
      });
      return data;
    } catch (err) {
      console.error("fetchHtml error:", err.message);
      throw new Error("Failed to fetch HTML content.");
    }
  }
  _parseListItem($, el) {
    const item = $(el);
    const link = item.attr("href");
    const animeIdMatch = link ? link.match(/\/anime\/(\d+)\//) : null;
    const animeId = animeIdMatch ? animeIdMatch[1] : null;
    const episodeOrRating = item.find(".ep > span:first-child").text().trim().replace(/\s+/g, " ") || item.find(".ep").text().trim().replace(/\s+/g, " ");
    return {
      id: animeId,
      title: item.find("h5.sidebar-title-h5").text().trim(),
      link: link,
      image: item.find(".set-bg").attr("data-setbg") || "",
      info: episodeOrRating,
      quality: item.find(".view").text().trim() || "",
      status: item.find(".d-none span").text().trim() || ""
    };
  }
  _parsePagination($) {
    return $(".product__pagination a").get().map(el => {
      const linkEl = $(el);
      return {
        text: linkEl.text().trim().replace("...", ""),
        link: linkEl.attr("href"),
        isCurrent: linkEl.hasClass("current-page"),
        isDisabled: linkEl.attr("aria-disabled") === "true"
      };
    }).filter(v => v.text);
  }
  async home() {
    try {
      const homeUrl = `https://${this.host}/`;
      const html = await this.fetchHtml(homeUrl);
      const $ = cheerio.load(html);
      const parseAnimeItem = ($, el) => {
        const item = $(el);
        return {
          title: item.find("h5.sidebar-title-h5").text().trim(),
          link: item.attr("href"),
          image: item.find(".set-bg").attr("data-setbg") || "",
          rating: item.find(".ep").text().trim().replace(/\s+/g, " ") || "N/A",
          quality: item.find(".view").text().trim() || ""
        };
      };
      const getSectionData = (section, title) => {
        const items = section.find(".filter__gallery > a").get().map(el => parseAnimeItem($, el));
        const seeAllLink = section.find(".btn__all a").attr("href");
        return {
          items: items,
          seeAll: seeAllLink
        };
      };
      const sections = $(".trending__product");
      const ongoingSection = sections.filter((i, el) => $(el).find(".section-title h4").text().trim() === "Sedang Tayang").eq(0);
      const finishedSection = sections.filter((i, el) => $(el).find(".section-title h4").text().trim() === "Selesai Tayang").eq(0);
      const movieSection = sections.filter((i, el) => $(el).find(".section-title h4").text().trim() === "Film Layar Lebar").eq(0);
      const ongoing = getSectionData(ongoingSection, "Sedang Tayang");
      const finished = getSectionData(finishedSection, "Selesai Tayang");
      const movies = getSectionData(movieSection, "Film Layar Lebar");
      return {
        ongoing: ongoing,
        finished: finished,
        movies: movies
      };
    } catch (err) {
      console.error("home error:", err.message);
      throw err;
    }
  }
  async schedule({
    day = getDayName(new Date())
  } = {}) {
    try {
      const scheduledDay = day.toLowerCase();
      const url = `https://${this.host}/schedule?scheduled_day=${scheduledDay}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      const dayTitle = $(".product__page__title .section-title h4 .choosenProperty").text().replace(":", "").trim();
      const items = $("#animeList .filter__gallery > a").get().map(el => {
        const item = $(el);
        const idRegex = item.find("input[class*='actual-schedule-ep-']").attr("class")?.match(/actual-schedule-ep-(\d+)-real/);
        const animeId = idRegex ? idRegex[1] : null;
        const epStatus = item.find(".ep > span:not([style*='display: none'])").text().trim().replace(/\s+/g, " ");
        const nextEpisodeEl = item.find(`.actual-schedule-ep-${animeId}`);
        const nextEpisodeText = nextEpisodeEl.length ? nextEpisodeEl.text().trim().replace("Selanjutnya: Ep", "").trim() : null;
        const totalEpEl = item.find(`.total-eps-${animeId}`);
        const totalEpisodes = totalEpEl.length ? totalEpEl.val() : null;
        const scheduleInfo = item.find(`.actual-schedule-info-${animeId}`).text().trim().replace(/\s+/g, " ");
        return {
          id: animeId,
          title: item.find("h5.sidebar-title-h5").text().trim(),
          link: item.attr("href"),
          image: item.find(".set-bg").attr("data-setbg") || "",
          status: epStatus,
          nextEpisode: nextEpisodeText,
          totalEpisodes: totalEpisodes && totalEpisodes !== "0" ? parseInt(totalEpisodes) : null,
          schedule: scheduleInfo
        };
      }).filter(v => v.link && v.title);
      const pagination = this._parsePagination($);
      return {
        day: dayTitle,
        items: items,
        pagination: pagination
      };
    } catch (err) {
      console.error("schedule error:", err.message);
      throw err;
    }
  }
  async ongoing({
    order_by = "latest",
    page = 1
  } = {}) {
    try {
      const url = `https://${this.host}/quick/ongoing?order_by=${order_by.toLowerCase()}&page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      const orderByText = $(".product__page__filter .nice-select .current").text().trim() || order_by;
      const items = $("#animeList .filter__gallery > a").get().map(el => {
        const item = $(el);
        const link = item.attr("href");
        const animeIdMatch = link ? link.match(/\/anime\/(\d+)\//) : null;
        const animeId = animeIdMatch ? animeIdMatch[1] : null;
        return {
          id: animeId,
          title: item.find("h5.sidebar-title-h5").text().trim(),
          link: link,
          image: item.find(".set-bg").attr("data-setbg") || "",
          episode: item.find(".ep > span:first-child").text().trim().replace(/\s+/g, " ") || "N/A",
          quality: item.find(".view").text().trim() || "",
          status: item.find(".d-none span").text().trim() || ""
        };
      }).filter(v => v.link && v.title);
      const pagination = this._parsePagination($);
      return {
        pageTitle: "Sedang Tayang",
        orderBy: orderByText,
        items: items,
        pagination: pagination
      };
    } catch (err) {
      console.error("ongoing error:", err.message);
      throw err;
    }
  }
  async finished({
    order_by = "latest",
    page = 1
  } = {}) {
    try {
      const url = `https://${this.host}/quick/finished?order_by=${order_by.toLowerCase()}&page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      const orderByText = $(".product__page__filter .nice-select .current").text().trim() || order_by;
      const items = $("#animeList .filter__gallery > a").get().map(el => this._parseListItem($, el));
      const pagination = this._parsePagination($);
      return {
        pageTitle: "Selesai Tayang",
        orderBy: orderByText,
        items: items,
        pagination: pagination
      };
    } catch (err) {
      console.error("finished error:", err.message);
      throw err;
    }
  }
  async movie({
    order_by = "latest",
    page = 1
  } = {}) {
    try {
      const url = `https://${this.host}/quick/movie?order_by=${order_by.toLowerCase()}&page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      const orderByText = $(".product__page__filter .nice-select .current").text().trim() || order_by;
      const items = $("#animeList .filter__gallery > a").get().map(el => this._parseListItem($, el));
      const pagination = this._parsePagination($);
      return {
        pageTitle: "Film Layar Lebar",
        orderBy: orderByText,
        items: items,
        pagination: pagination
      };
    } catch (err) {
      console.error("movie error:", err.message);
      throw err;
    }
  }
  async search({
    query
  }) {
    try {
      const url = `${this.baseUrl}?search=${encodeURIComponent(query)}&order_by=oldest`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      const results = $("#animeList .filter__gallery > a").get().map(el => {
        const em = $(el);
        return {
          title: em.find("h5").eq(0).text().trim(),
          link: em.attr("href"),
          image: em.find(".set-bg").attr("data-setbg") || "",
          rating: em.find(".ep span").eq(0).text().trim() || "N/A",
          quality: em.find(".view").eq(0).text().trim() || "",
          status: em.find(".d-none span").eq(0).text().trim() || ""
        };
      }).filter(v => v.link && v.title).sort((a, b) => a.title.localeCompare(b.title));
      return results;
    } catch (err) {
      console.error("search error:", err.message);
      throw err;
    }
  }
  async detail({
    url
  }) {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      const li = i => $(".anime__details__widget li").eq(i);
      const text = i => li(i).find(".col-9 a").text().trim();
      const list = i => li(i).find(".col-9 a").map((_, el) => $(el).text().trim()).get().join(", ");
      const detailsText = $(".anime__details__text");
      const episodes = [...($("#episodeLists").attr("data-content") || "").matchAll(/href='([^']+\/episode\/[^']+)'[^>]*>([^<]+)</g)].map(([, link, title]) => ({
        title: title.trim(),
        link: link
      })).sort((a, b) => a.title.localeCompare(b.title));
      return {
        title: detailsText.find(".anime__details__title h3").text().trim(),
        altTitle: detailsText.find(".anime__details__title span").text().trim(),
        synopsis: detailsText.find("#synopsisField").text().replace(/\s+LIHAT SEMUA\s+▼/, "").trim(),
        type: text(0),
        episode: text(1),
        status: text(2),
        airingPeriod: li(3).find(".col-9 a").map((_, el) => $(el).text().trim()).get().join(" s/d "),
        season: text(4),
        duration: text(5),
        quality: text(6),
        country: text(7),
        source: text(8),
        genre: list(9),
        explicit: li(10).find(".col-9").text().trim(),
        demographics: li(11).find(".col-9").text().trim(),
        themes: list(12),
        studio: text(13),
        score: text(14),
        favorites: text(15),
        rating: text(16),
        credit: text(17),
        episodes: episodes
      };
    } catch (err) {
      console.error("detail error:", err.message);
      throw err;
    }
  }
  async download({
    url
  }) {
    try {
      const authToken = await this.getAuthToken();
      const params = {
        "2dwOyrchwnizxjj": authToken,
        L4Gax9MwiLIA5U9: "kuramadrive",
        page: 1
      };
      const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
      const html = await this.fetchHtml(fullUrl);
      const $ = cheerio.load(html);
      const episodes = $("#animeEpisodes a").map((_, el) => ({
        title: $(el).text().trim(),
        link: $(el).attr("href")
      })).get().filter(v => v.link && v.title).sort((a, b) => a.title.localeCompare(b.title));
      const downloadLinks = $("#downloadLinkSection").find("#animeDownloadLink").children("h6").map((_, el) => {
        const quality = $(el).text().trim();
        const links = $(el).nextUntil("h6").map((_, linkEl) => {
          const link = $(linkEl).attr("href");
          const label = $(linkEl).text().trim();
          return {
            label: label,
            link: link
          };
        }).get().filter(v => v.link && v.label);
        return {
          quality: quality,
          links: links
        };
      }).get();
      return {
        eps: episodes,
        download: downloadLinks
      };
    } catch (err) {
      console.error("download error:", err.message);
      throw err;
    }
  }
  async getAuthToken() {
    try {
      const html = await this.fetchHtml(`https://${this.host}/assets/eSJLfYB5SYxQk4k.txt`);
      return html.trim();
    } catch (err) {
      console.error("getAuthToken error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    host,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "home | schedule | ongoing | finished | movie | search | detail | download"
      }
    });
  }
  const kurama = new Kurama({
    host: host
  });
  try {
    let result;
    switch (action) {
      case "home":
        result = await kurama.home();
        break;
      case "schedule":
        result = await kurama.schedule(params);
        break;
      case "ongoing":
        result = await kurama.ongoing(params);
        break;
      case "finished":
        result = await kurama.finished(params);
        break;
      case "movie":
        result = await kurama.movie(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Missing required field: query (required for search)"
          });
        }
        result = await kurama.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Missing required field: url (required for detail)"
          });
        }
        result = await kurama.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: "Missing required field: url (required for download)"
          });
        }
        result = await kurama.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions: home | schedule | ongoing | finished | movie | search | detail | download`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}