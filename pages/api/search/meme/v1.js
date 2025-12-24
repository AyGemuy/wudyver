import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class KnowYourMeme {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.baseUrl = "https://knowyourmeme.com";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "upgrade-insecure-requests": "1"
    };
  }
  async home() {
    console.log("🏠 Fetching home page");
    try {
      const {
        data
      } = await this.client.get(this.baseUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const result = {
        todayInCulture: [],
        topEntries: [],
        freshEntries: [],
        trendingImages: []
      };
      $(".top-cards .card, .top-cards .overlayed-card").each((i, el) => {
        const card = $(el);
        result.todayInCulture.push({
          title: card.find(".title").text()?.trim() || "",
          link: card.attr("href") || "",
          image: card.find("img").attr("src-large") || card.find("img").attr("src") || "",
          category: card.find(".stamp span").text()?.trim() || "",
          badge: card.find(".badge").text()?.trim() || "",
          author: card.find(".user").attr("alt") || "",
          timestamp: card.find(".info span").text()?.trim() || ""
        });
      });
      $(".top-meme-entries .simple-card").each((i, el) => {
        const card = $(el);
        result.topEntries.push({
          title: card.find(".title").text()?.trim() || "",
          link: card.attr("href") || "",
          image: card.find("img").attr("src-large") || card.find("img").attr("src") || "",
          category: card.find(".stamp").attr("aria-label") || "",
          author: card.find(".user").attr("alt") || "",
          timestamp: card.find(".info span").text()?.trim() || ""
        });
      });
      $(".fresh-entries .wide-card").each((i, el) => {
        const card = $(el);
        result.freshEntries.push({
          title: card.find(".title").text()?.trim() || "",
          link: card.attr("href") || "",
          image: card.find("img").attr("src-large") || card.find("img").attr("src") || "",
          category: card.find(".stamp").attr("aria-label") || "",
          author: card.find(".user").attr("alt") || "",
          timestamp: card.find(".info span").text()?.trim() || ""
        });
      });
      $("#trending_photos .item").each((i, el) => {
        const item = $(el);
        result.trendingImages.push({
          title: item.find("img").attr("alt") || "",
          link: item.attr("href") || "",
          image: item.find("img").attr("src") || ""
        });
      });
      console.log("✅ Home page fetched successfully");
      return result;
    } catch (e) {
      console.log(`❌ Home error: ${e.message}`);
      throw e;
    }
  }
  async kind({
    kind = "confirmed",
    sort = "newest",
    page = 1
  }) {
    console.log(`📂 Fetching entries: kind=${kind}, sort=${sort}, page=${page}`);
    try {
      const url = `${this.baseUrl}/memes?kind=${kind}&sort=${sort}&page=${page}`;
      const {
        data
      } = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const result = {
        total: $(".pretty_total_results").text()?.match(/\d+/)?.[0] || "0",
        currentPage: page,
        entries: []
      };
      $(".gallery .item").each((i, el) => {
        const item = $(el);
        result.entries.push({
          title: item.attr("data-title") || item.find(".title").text()?.trim() || "",
          link: item.attr("href") || "",
          image: item.find("img").attr("data-image") || item.find("img").attr("src") || "",
          category: item.find(".stamp").attr("aria-label") || "",
          author: item.attr("data-author") || item.find(".user").attr("alt") || "",
          entryId: item.attr("data-entry-id") || "",
          entryName: item.attr("data-entry-name") || ""
        });
      });
      console.log(`✅ Found ${result.entries.length} entries`);
      return result;
    } catch (e) {
      console.log(`❌ Kind error: ${e.message}`);
      throw e;
    }
  }
  async photo({
    sort = "newest",
    page = 1
  }) {
    console.log(`📸 Fetching photos: sort=${sort}, page=${page}`);
    try {
      const url = `${this.baseUrl}/photos?sort=${sort}&page=${page}`;
      const {
        data
      } = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const result = {
        total: $(".pretty_total_results").text()?.match(/\d+/)?.[0] || "0",
        currentPage: page,
        photos: []
      };
      $(".gallery .item").each((i, el) => {
        const item = $(el);
        result.photos.push({
          title: item.attr("data-title") || item.find(".title").text()?.trim() || "",
          link: item.attr("href") || "",
          image: item.find("img").attr("data-image") || item.find("img").attr("src") || "",
          alt: item.attr("alt") || item.find("img").attr("alt") || "",
          author: item.attr("data-author") || "",
          commentsLink: item.attr("data-comments-link") || "",
          entryId: item.attr("data-entry-id") || "",
          entryName: item.attr("data-entry-name") || "",
          isPhoto: item.attr("data-is-photo") === "true"
        });
      });
      console.log(`✅ Found ${result.photos.length} photos`);
      return result;
    } catch (e) {
      console.log(`❌ Photo error: ${e.message}`);
      throw e;
    }
  }
  async search(params) {
    return await this.generate(params);
  }
  async generate({
    query,
    limit = 5,
    detail = false,
    ...rest
  }) {
    console.log(`🔍 Searching for: ${query}`);
    try {
      const url = `${this.baseUrl}/search?context=&sort=&q=${encodeURIComponent(query)}`;
      const {
        data
      } = await this.client.get(url, {
        headers: {
          ...this.headers,
          referer: `${this.baseUrl}/memes`
        }
      });
      const $ = cheerio.load(data);
      const totalResults = $(".pretty_total_results").text()?.match(/\d+/)?.[0] || "0";
      const noResults = $(".no-results").text()?.trim() || "";
      console.log(`📊 Total results: ${totalResults}`);
      if (noResults && parseInt(totalResults) === 0) {
        console.log("⚠️ No results found");
        return {
          total: "0",
          data: [],
          message: noResults
        };
      }
      const results = $(".item.has-quick-info, a.item[data-title]").map((i, el) => {
        if (i >= limit) return null;
        const em = $(el);
        const img = em.find("img").eq(0);
        const title = em.attr("data-title") || em.find("h3").first().text()?.trim() || "";
        const href = em.attr("href") || "";
        const imgSrc = img.attr("data-src") || img.attr("src") || "";
        return {
          title: title,
          link: href?.startsWith("http") ? href : `${this.baseUrl}${href}`,
          image: imgSrc?.replace(/newsfeed|mobile/g, "original") || "",
          alt: em.attr("alt") || img.attr("alt") || "",
          author: em.attr("data-author") || img.attr("data-author") || "",
          entryId: em.attr("data-data-entry-id") || em.attr("data-entry-id") || "",
          entryName: em.attr("data-data-entry-name") || em.attr("data-entry-name") || "",
          entryLink: em.attr("data-data-entry-link") || em.attr("data-entry-link") || "",
          commentsLink: em.attr("data-comments-link") || "",
          offset: em.attr("data-offset") || em.attr("data-data-offset") || ""
        };
      }).get().filter(item => item && item.title);
      console.log(`✅ Found ${results.length} results`);
      if (detail && results.length > 0) {
        const detailed = [];
        for (const item of results) {
          console.log(`📝 Fetching details for: ${item.title}`);
          try {
            const det = await this.detail({
              url: item.link,
              ...rest
            });
            detailed.push({
              ...item,
              ...det
            });
          } catch (e) {
            console.log(`❌ Error fetching detail: ${e.message}`);
            detailed.push(item);
          }
        }
        return {
          total: totalResults,
          data: detailed
        };
      }
      return {
        total: totalResults,
        data: results
      };
    } catch (e) {
      console.log(`❌ Search error: ${e.message}`);
      throw e;
    }
  }
  async detail({
    url,
    ...rest
  }) {
    const link = url?.includes("http") ? url : `${this.baseUrl}/memes/${url}`;
    console.log(`📄 Fetching detail from: ${link}`);
    try {
      const {
        data
      } = await this.client.get(link, {
        headers: {
          ...this.headers,
          referer: `${this.baseUrl}/search`
        }
      });
      const $ = cheerio.load(data);
      const title = $(".content-title, h1.content-title").eq(0).text()?.trim() || "";
      const category = $(".entry-category-badge").text()?.trim() || "";
      const status = $('dt:contains("Status")').next("dd").text()?.trim() || "";
      const type = $(".entry-type-link").text()?.trim() || $('dt:contains("Type")').next("dd").text()?.trim() || "";
      const year = $('dt:contains("Year")').next("dd").find("a").text()?.trim() || $('dt:contains("Year")').next("dd").text()?.trim() || "";
      const origin = $("dd.entry_origin_link a").text()?.trim() || $('dt:contains("Origin")').next("dd").find("a").text()?.trim() || "";
      const region = $('dt:contains("Region")').next("dd").find("a").text()?.trim() || $('dt:contains("Region")').next("dd").text()?.trim() || "";
      const stats = {
        views: $("dd.views a").text()?.trim() || $(".stats dd").eq(0).text()?.trim() || "",
        videos: $("dd.videos a").text()?.trim() || $(".stats dd").eq(1).text()?.trim() || "",
        photos: $("dd.photos a").text()?.trim() || $(".stats dd").eq(2).text()?.trim() || "",
        comments: $("dd.comments a").text()?.trim() || $(".comments_count").text()?.match(/\d+/)?.[0] || ""
      };
      const dates = {
        updated: $("footer p").eq(0).find("abbr").attr("title") || "",
        updatedBy: $("footer p").eq(0).find("a").text()?.trim() || "",
        added: $("footer p").eq(1).find("abbr").attr("title") || "",
        addedBy: $("footer p").eq(1).find("a").text()?.trim() || ""
      };
      const headerInfo = $(".entry-header-info").text() || "";
      const addedText = headerInfo.match(/Added\s+(.+?)(?=\/|$)/)?.[1]?.trim() || "";
      const updatedText = headerInfo.match(/Updated\s+(.+?)$/)?.[1]?.trim() || "";
      const tags = $("#entry_tags a").map((i, el) => $(el).attr("data-tag")).get().filter(Boolean);
      const about = $("#about + *").find("p").eq(0).text()?.trim() || $(".bodycopy p").eq(0).text()?.trim() || "";
      const origin_section = $("#origin + *").find("p").map((i, el) => $(el).text()?.trim()).get().join("\n") || "";
      const spread_section = $("#spread + *").find("p").map((i, el) => $(el).text()?.trim()).get().join("\n") || "";
      const images = $("#entry-top-images img, #recent-images img, .photo_box img").map((i, el) => {
        const em = $(el);
        const img = em.attr("data-src") || em.attr("src") || "";
        const title = em.attr("title") || em.attr("alt") || "";
        return img && !img.includes("blank") ? {
          url: img.replace(/list|medium|mobile|newsfeed/, "original"),
          title: title
        } : null;
      }).get().filter(Boolean);
      const videos = $("#recent-videos .video_box, #videos_list .video_box").map((i, el) => {
        const em = $(el);
        const link = em.find("a.video").attr("href") || "";
        const thumb = em.find("img").attr("data-src") || em.find("img").attr("src") || "";
        const title = em.find(".info strong").text()?.trim() || "";
        const entry = em.find(".info em").text()?.trim() || "";
        const uploader = em.find(".info").text()?.match(/by\s+(.+?)$/)?.[1]?.trim() || "";
        return link ? {
          url: link.startsWith("http") ? link : `${this.baseUrl}${link}`,
          thumbnail: thumb,
          title: title,
          entry: entry,
          uploadedBy: uploader
        } : null;
      }).get().filter(Boolean);
      const relatedEntries = $("#related-entries .entry_list td, .related_memes td").map((i, el) => {
        const em = $(el);
        const link = em.find("a.photo").attr("href") || "";
        const img = em.find("img").attr("data-src") || em.find("img").attr("src") || "";
        const name = em.find("h2 a").text()?.trim() || "";
        return link ? {
          name: name,
          url: link.startsWith("http") ? link : `${this.baseUrl}${link}`,
          image: img
        } : null;
      }).get().filter(Boolean);
      const parentEntry = $(".parent h5 a").eq(0).text()?.trim() || "";
      const parentLink = $(".parent h5 a").eq(0).attr("href") || "";
      const mainImage = $(".main-image img, header .photo img").eq(0).attr("src") || $(".main-image img, header .photo img").eq(0).attr("data-src") || "";
      const videoEmbed = $("lite-youtube").attr("videoid") || $("#entry-episode lite-youtube").attr("videoid") || "";
      console.log(`✅ Detail fetched: ${title}`);
      return {
        title: title,
        category: category,
        status: status,
        type: type,
        year: year,
        origin: origin,
        region: region,
        stats: stats,
        dates: {
          ...dates,
          addedText: addedText,
          updatedText: updatedText
        },
        tags: tags,
        about: about,
        origin_section: origin_section?.substring(0, 1e3) || "",
        spread_section: spread_section?.substring(0, 1e3) || "",
        mainImage: mainImage,
        videoEmbed: videoEmbed ? `https://www.youtube.com/watch?v=${videoEmbed}` : "",
        images: images.slice(0, 16),
        videos: videos.slice(0, 12),
        relatedEntries: relatedEntries.slice(0, 5),
        parentEntry: parentEntry ? {
          name: parentEntry,
          url: parentLink.startsWith("http") ? parentLink : `${this.baseUrl}${parentLink}`
        } : null,
        url: link
      };
    } catch (e) {
      console.log(`❌ Detail error: ${e.message}`);
      throw e;
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
      error: "Parameter 'action' wajib diisi.",
      availableActions: ["home", "kind", "photo", "search", "detail"]
    });
  }
  const api = new KnowYourMeme();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "kind":
        response = await api.kind(params);
        break;
      case "photo":
        response = await api.photo(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          availableActions: ["home", "kind", "photo", "search", "detail"]
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