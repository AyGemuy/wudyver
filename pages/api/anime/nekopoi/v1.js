import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class NekoPoi {
  constructor() {
    this.host = "https://nekopoi.care";
    this.proxy = proxy;
    this.source = "nekopoi";
  }
  proxyUrl(url) {
    return `${this.proxy}${url}`;
  }
  extractId(url) {
    return url.replace(this.host, "").replace(/^\/|\/$/g, "");
  }
  extractTooltipInfo($el) {
    const tooltip = $el.attr("original-title") || "";
    if (!tooltip) return {};
    const info = {};
    const $tooltip = cheerio.load(tooltip);
    $tooltip("p").each((_, p) => {
      const text = $tooltip(p).text().trim();
      if (text.includes("Nama Jepang")) {
        info.japanName = text.replace(/Nama Jepang\s*:\s*/i, "").trim();
      }
      if (text.includes("Produser")) {
        info.producers = text.replace(/Produser\s*:\s*/i, "").trim();
      }
      if (text.includes("Tipe")) {
        info.type = text.replace(/Tipe\s*:\s*/i, "").trim();
      }
      if (text.includes("Status")) {
        info.status = text.replace(/Status\s*:\s*/i, "").trim();
      }
      if (text.includes("Durasi")) {
        info.duration = text.replace(/Durasi\s*:\s*/i, "").trim();
      }
      if (text.includes("Skor")) {
        const score = text.replace(/Skor\s*:\s*/i, "").trim();
        info.score = parseFloat(score) || 0;
      }
    });
    const genres = [];
    $tooltip("a[href*='/genres/']").each((_, a) => {
      genres.push($tooltip(a).text().trim());
    });
    if (genres.length > 0) info.genres = genres;
    return info;
  }
  async home({
    page = 1
  } = {}) {
    try {
      console.log(`Fetching home page: ${page}`);
      const url = page === 1 ? this.host : `${this.host}/page/${page}/`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const recommended = [];
      $(".rekomendasi .showticker ul li a.series").each((_, el) => {
        const $el = $(el);
        const link = $el.attr("href") || "";
        const id = this.extractId(link);
        const title = $el.text().trim();
        const tooltipInfo = this.extractTooltipInfo($el);
        const image = $tooltip("img").attr("src") || "";
        if (id && title) {
          recommended.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            link: link,
            ...tooltipInfo
          });
        }
      });
      const episodes = [];
      $("#boxid .eropost").each((_, el) => {
        const $el = $(el);
        const link = $el.find(".eroinfo h2 a").attr("href") || "";
        const id = this.extractId(link);
        const title = $el.find(".eroinfo h2 a").text().trim() || "Untitled";
        const image = $el.find(".eroimg img").attr("src") || "";
        const date = $el.find(".eroinfo span").first().text().trim() || "";
        const seriesLink = $el.find(".eroinfo span a").attr("href") || "";
        const series = $el.find(".eroinfo span a").text().trim() || "";
        const seriesId = seriesLink ? this.extractId(seriesLink) : "";
        if (id) {
          episodes.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            date: date,
            series: series ? {
              id: seriesId,
              title: series,
              link: seriesLink
            } : null,
            link: link
          });
        }
      });
      const latestHentai = [];
      $(".animeseries ul li").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.series");
        const link = $link.attr("href") || "";
        const id = this.extractId(link);
        const title = $el.find(".title").text().trim();
        const image = $el.find("img").attr("src") || "";
        const tooltipInfo = this.extractTooltipInfo($link);
        if (id && title) {
          latestHentai.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            link: link,
            ...tooltipInfo
          });
        }
      });
      const jav = [];
      $(".videoarea ul li").each((_, el) => {
        const $el = $(el);
        const link = $el.find("a").first().attr("href") || "";
        const id = this.extractId(link);
        const title = $el.find("h2").text().trim();
        const image = $el.find("img").attr("src") || "";
        if (id && title) {
          jav.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            link: link
          });
        }
      });
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      const currentPage = parseInt($(".pagination .current").text()) || page;
      const totalPages = parseInt($(".pagination .page-numbers").not(".dots, .next, .prev").last().text()) || 1;
      console.log(`Fetched home: ${episodes.length} episodes, ${recommended.length} recommended, ${latestHentai.length} hentai, ${jav.length} jav`);
      return {
        recommended: recommended,
        episodes: episodes,
        latestHentai: latestHentai,
        jav: jav,
        pagination: {
          current: currentPage,
          total: totalPages,
          hasNext: hasNext,
          hasPrev: hasPrev
        }
      };
    } catch (err) {
      console.error("Error fetching home:", err.message);
      return {
        recommended: [],
        episodes: [],
        latestHentai: [],
        jav: [],
        pagination: {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }
  async category({
    slug = "hentai",
    page = 1
  } = {}) {
    try {
      console.log(`Fetching category: ${slug}, page: ${page}`);
      const url = page === 1 ? `${this.host}/category/${slug}/` : `${this.host}/category/${slug}/page/${page}/`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const items = [];
      $(".animeseries ul li").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.series");
        const link = $link.attr("href") || "";
        const id = this.extractId(link);
        const title = $el.find(".title").text().trim() || "Untitled";
        const image = $el.find("img").attr("src") || "";
        const tooltipInfo = this.extractTooltipInfo($link);
        if (id) {
          items.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            link: link,
            type: "series",
            ...tooltipInfo
          });
        }
      });
      $("#boxid .eropost").each((_, el) => {
        const $el = $(el);
        const link = $el.find(".eroinfo h2 a").attr("href") || "";
        const id = this.extractId(link);
        const title = $el.find(".eroinfo h2 a").text().trim() || "Untitled";
        const image = $el.find(".eroimg img").attr("src") || "";
        const date = $el.find(".eroinfo span").first().text().trim() || "";
        const seriesLink = $el.find(".eroinfo span a").attr("href") || "";
        const series = $el.find(".eroinfo span a").text().trim() || "";
        const seriesId = seriesLink ? this.extractId(seriesLink) : "";
        if (id) {
          items.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            date: date,
            series: series ? {
              id: seriesId,
              title: series,
              link: seriesLink
            } : null,
            link: link,
            type: "episode"
          });
        }
      });
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      const currentPage = parseInt($(".pagination .current").text()) || page;
      const totalPages = parseInt($(".pagination .page-numbers").not(".dots, .next, .prev").last().text()) || 1;
      console.log(`Fetched ${items.length} items from category: ${slug}`);
      return {
        category: slug,
        items: items,
        pagination: {
          current: currentPage,
          total: totalPages,
          hasNext: hasNext,
          hasPrev: hasPrev
        }
      };
    } catch (err) {
      console.error("Error fetching category:", err.message);
      return {
        category: slug,
        items: [],
        pagination: {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }
  async search({
    query = "",
    page = 1
  } = {}) {
    try {
      console.log(`Searching: ${query}, page: ${page}`);
      const q = encodeURIComponent(query);
      const url = page === 1 ? `${this.host}/?s=${q}&post_type=anime` : `${this.host}/search/${q}/page/${page}/`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const items = [];
      $(".result ul li").each((_, el) => {
        const $el = $(el);
        const link = $el.find("h2 a").attr("href") || "";
        const id = this.extractId(link);
        const title = $el.find("h2 a").text().trim() || "Untitled";
        const image = $el.find("img").attr("src") || "";
        const genre = $el.find(".genre").text().trim() || "";
        const info = {};
        $el.find(".desc p").each((_, p) => {
          const text = $(p).text().trim();
          if (text.includes("Parody")) {
            info.parody = text.replace(/Parody\s*:\s*/i, "").trim();
          }
          if (text.includes("Producers")) {
            info.producers = text.replace(/Producers\s*:\s*/i, "").trim();
          }
          if (text.includes("Artist")) {
            info.artist = text.replace(/Artist\s*:\s*/i, "").trim();
          }
          if (text.includes("Genre")) {
            info.genre = text.replace(/Genre\s*:\s*/i, "").trim();
          }
          if (text.includes("Duration")) {
            info.duration = text.replace(/Duration\s*:\s*/i, "").trim();
          }
          if (text.includes("Size")) {
            info.size = text.replace(/Size\s*:\s*/i, "").trim();
          }
        });
        if (id) {
          items.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            genre: genre,
            info: info,
            link: link
          });
        }
      });
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      const currentPage = parseInt($(".pagination .current").text()) || page;
      const totalPages = parseInt($(".pagination .page-numbers").not(".dots, .next, .prev").last().text()) || 1;
      console.log(`Found ${items.length} results for: ${query}`);
      return {
        query: query,
        items: items,
        pagination: {
          current: currentPage,
          total: totalPages,
          hasNext: hasNext,
          hasPrev: hasPrev
        }
      };
    } catch (err) {
      console.error("Error searching:", err.message);
      return {
        query: query,
        items: [],
        pagination: {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }
  async detail({
    id = ""
  } = {}) {
    try {
      console.log(`Fetching detail: ${id}`);
      const url = `${this.host}/${id}`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const title = $(".headpost h1").text().trim() || "Untitled";
      const image = $(".thm img").attr("src") || "";
      const dateText = $(".headpost .eroinfo p").first().text().trim() || "";
      const viewsMatch = dateText.match(/Dilihat\s+(\d+)/i);
      const views = viewsMatch ? parseInt(viewsMatch[1]) : 0;
      const date = dateText.replace(/Dilihat.*$/i, "").trim();
      const info = {};
      $(".konten p").each((_, el) => {
        const text = $(el).text().trim();
        const patterns = [{
          key: "parody",
          regex: /(?:Parody|Anime)\s*:\s*(.+)/i
        }, {
          key: "producers",
          regex: /Producers?\s*:\s*(.+)/i
        }, {
          key: "artist",
          regex: /Artist\s*:\s*(.+)/i
        }, {
          key: "genre",
          regex: /Genre\s*:\s*(.+)/i
        }, {
          key: "duration",
          regex: /Duration\s*:\s*(.+)/i
        }, {
          key: "size",
          regex: /Size\s*:\s*(.+)/i
        }];
        patterns.forEach(({
          key,
          regex
        }) => {
          const match = text.match(regex);
          if (match) {
            info[key] = match[1].trim();
          }
        });
      });
      const notes = $(".konten h3").text().trim() || "";
      const resolutions = [];
      if (notes) {
        const resMatches = notes.match(/‘(\d+[pP](?:\/\d+[pP])?|Alternatif|Unknown)’/g) || [];
        resMatches.forEach(match => {
          resolutions.push(match.replace(/‘|’/g, "").trim());
        });
      }
      if (resolutions.length === 0) {
        resolutions.push("360p/480p", "720p", "Alternative");
      }
      const streams = [];
      $("#show-stream .openstream").each((index, el) => {
        const $el = $(el);
        const iframe = $el.find("iframe");
        const src = iframe.attr("src");
        const streamId = $el.attr("id");
        if (src) {
          streams.push({
            index: index + 1,
            id: streamId || `stream${index + 1}`,
            url: src,
            label: `Stream ${index + 1}`,
            resolution: resolutions[index] || "Unknown"
          });
        }
      });
      const downloads = [];
      $(".boxdownload .liner").each((_, el) => {
        const $el = $(el);
        const qualityText = $el.find(".name").text().trim();
        const resMatch = qualityText.match(/\[(\d+p)\]/i);
        const resolution = resMatch ? resMatch[1] : "";
        const links = [];
        $el.find(".listlink p").each((_, pEl) => {
          const $p = $(pEl);
          const category = $p.find("b").text().trim();
          $p.find("a").each((_, linkEl) => {
            const $link = $(linkEl);
            const href = $link.attr("href");
            const text = $link.text().trim();
            if (href) {
              const isShortened = href.includes("ouo.io") || href.includes("linkpoi.me") || href.includes("bit.ly") || href.includes("short");
              links.push({
                label: text,
                url: href,
                category: category || "Direct",
                shortened: isShortened
              });
            }
          });
        });
        if (qualityText && links.length > 0) {
          downloads.push({
            quality: qualityText,
            resolution: resolution,
            links: links
          });
        }
      });
      const related = [];
      $("ul.related1 li").each((_, el) => {
        const $el = $(el);
        const link = $el.find(".nf h2 a").attr("href") || "";
        const relatedId = this.extractId(link);
        const relatedTitle = $el.find(".nf h2 a").text().trim();
        const relatedImage = $el.find(".img img").attr("src") || "";
        if (relatedId && relatedTitle) {
          related.push({
            id: relatedId,
            title: relatedTitle,
            coverImage: relatedImage,
            link: link,
            type: "related"
          });
        }
      });
      const similarSeries = [];
      $("ul.related li").each((_, el) => {
        const $el = $(el);
        const $link = $el.find(".rights .title a");
        const link = $link.attr("href") || "";
        const seriesId = this.extractId(link);
        const seriesTitle = $link.text().trim();
        const seriesImage = $el.find(".border img").attr("src") || "";
        const tooltipInfo = this.extractTooltipInfo($link);
        if (seriesId && seriesTitle) {
          similarSeries.push({
            id: seriesId,
            title: seriesTitle,
            coverImage: seriesImage,
            link: link,
            type: "series",
            ...tooltipInfo
          });
        }
      });
      const recommended = [];
      $(".rekomendasi .showticker ul li a.series").each((_, el) => {
        const $el = $(el);
        const link = $el.attr("href") || "";
        const recId = this.extractId(link);
        const recTitle = $el.text().trim();
        const tooltipInfo = this.extractTooltipInfo($el);
        if (recId && recTitle) {
          recommended.push({
            id: recId,
            title: recTitle,
            link: link,
            ...tooltipInfo
          });
        }
      });
      const navigation = {
        prev: null,
        next: null
      };
      $(".pagineps a").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        const text = $el.text().trim();
        const navId = this.extractId(href);
        if (text.includes("«") || $el.hasClass("pagileft")) {
          navigation.prev = {
            id: navId,
            title: text.replace(/«\s*/g, "").trim(),
            link: href
          };
        } else if (text.includes("»") || $el.hasClass("pagiright")) {
          navigation.next = {
            id: navId,
            title: text.replace(/\s*»/g, "").trim(),
            link: href
          };
        }
      });
      const categories = [];
      $("#menu-menu-1 li").each((_, li) => {
        const $li = $(li);
        const catLink = $li.find("a").attr("href") || "";
        const catTitle = $li.find("a").text().trim();
        if (catLink && catTitle && catLink.includes("/category/")) {
          categories.push({
            title: catTitle,
            link: catLink
          });
        }
      });
      console.log(`Fetched detail for: ${title}`);
      return {
        id: id,
        source: this.source,
        title: title,
        coverImage: image,
        date: date,
        views: views,
        info: info,
        notes: notes,
        streams: streams,
        downloads: downloads,
        related: related,
        similarSeries: similarSeries,
        recommended: recommended,
        navigation: navigation,
        categories: categories
      };
    } catch (err) {
      console.error("Error fetching detail:", err.message);
      return {
        id: id,
        source: this.source,
        title: "Error",
        description: err.message,
        date: "",
        views: 0,
        info: {},
        notes: "",
        streams: [],
        downloads: [],
        related: [],
        similarSeries: [],
        recommended: [],
        navigation: {
          prev: null,
          next: null
        },
        categories: []
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
      actions: ["home", "category", "search", "detail"]
    });
  }
  const api = new NekoPoi();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "category":
        if (!params.slug) {
          return res.status(400).json({
            error: "Paramenter 'slug' wajib diisi untuk action 'category'.",
            examples: ["hentai", "2d-animation", "3d-hentai", "jav", "jav-cosplay"]
          });
        }
        response = await api.category(params);
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
        if (!params.id) {
          return res.status(400).json({
            error: "Paramenter 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          actions: ["home", "category", "search", "detail"]
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