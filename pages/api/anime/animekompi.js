import axios from "axios";
import * as cheerio from "cheerio";
class AnimeScraper {
  constructor() {
    this.baseUrl = "https://v1.animekompi.fun";
    console.log("AnimeScraper initialized");
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log(`🔍 Searching for: "${query}"`);
      const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl);
      const $ = cheerio.load(response.data);
      const results = [];
      $("article.bs").each((index, element) => {
        const $el = $(element);
        const $link = $el.find("a");
        const $img = $el.find("img");
        const title = $el.find(".tt h2").text()?.trim() || $el.find(".tt").contents().first().text()?.trim();
        const url = $link.attr("href");
        const image = $img.attr("src") || $img.attr("data-lazy-src") || $img.attr("data-src");
        const status = $el.find(".status").text()?.trim();
        const type = $el.find(".typez").text()?.trim();
        const episodeInfo = $el.find(".epx").first().text()?.trim();
        const subtitleType = $el.find(".sb").text()?.trim();
        const playIcon = $el.find(".ply i").attr("class") || null;
        const postId = $img.attr("post-id") || $link.attr("rel");
        const featured = $img.attr("fifu-featured") === "1";
        const imageTitle = $img.attr("title");
        const imageDimensions = {
          width: $img.attr("width"),
          height: $img.attr("height")
        };
        const itemType = $el.attr("itemtype");
        if (title && url) {
          results.push({
            title: title,
            url: url,
            image: image || null,
            status: status || "Unknown",
            type: type || "Unknown",
            episode: episodeInfo || "Unknown",
            subtitleType: subtitleType || null,
            playIcon: playIcon,
            metadata: {
              postId: postId || null,
              featured: featured || false,
              imageTitle: imageTitle || null,
              imageDimensions: imageDimensions,
              itemType: itemType || null
            },
            ...rest
          });
        }
      });
      const searchInfo = $(".releases h1 span").text()?.trim() || `Search results for "${query}"`;
      console.log(`✅ Found ${results.length} results - ${searchInfo}`);
      return {
        query: query,
        searchInfo: searchInfo,
        results: results,
        total: results.length,
        ...rest
      };
    } catch (error) {
      console.error("❌ Search error:", error.message);
      throw new Error(`Search failed: ${error.message}`);
    }
  }
  async detail({
    url,
    ...rest
  }) {
    try {
      console.log(`📖 Fetching detail: ${url}`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const title = $(".entry-title").text()?.trim();
      const $img = $(".tb img");
      const image = $img.attr("src") || $img.attr("data-lazy-src") || $img.attr("data-src");
      const imageMeta = {
        url: $('.tb meta[itemprop="url"]').attr("content"),
        width: $('.tb meta[itemprop="width"]').attr("content"),
        height: $('.tb meta[itemprop="height"]').attr("content")
      };
      const episodeNumber = $('meta[itemprop="episodeNumber"]').attr("content");
      const episodeType = $(".epx").text()?.trim();
      const subtitleInfo = $(".lg").text()?.trim();
      const releaseInfo = $(".year").text()?.trim();
      const releaseDate = $(".updated").text()?.trim();
      const seriesUrl = $(".year a").attr("href");
      const seriesName = $(".year a").text()?.trim();
      const socialMedia = [];
      $(".sosmed a").each((index, element) => {
        const $el = $(element);
        socialMedia.push({
          platform: $el.find("span").attr("class")?.replace("fab fa-", "") || "unknown",
          url: $el.attr("href"),
          ariaLabel: $el.attr("aria-label")
        });
      });
      const episodes = [];
      $("li[data-index]").each((index, element) => {
        const $el = $(element);
        const $link = $el.find("a");
        const episodeUrl = $link.attr("href");
        const episodeNum = $el.find(".epl-num").text()?.trim();
        const episodeTitle = $el.find(".epl-title").text()?.trim();
        const date = $el.find(".epl-date").text()?.trim();
        const dataIndex = $el.attr("data-index");
        if (episodeUrl && episodeNum) {
          episodes.push({
            index: parseInt(dataIndex) || index,
            number: episodeNum,
            title: episodeTitle || `Episode ${episodeNum}`,
            url: episodeUrl,
            date: date || null,
            rawTitle: episodeTitle
          });
        }
      });
      const navigation = {
        prev: {
          url: $('.naveps .nvs a[rel="prev"]').attr("href"),
          text: $('.naveps .nvs a[rel="prev"] .tex').text()?.trim()
        },
        allEpisodes: {
          url: $(".naveps .nvsc a").attr("href"),
          text: $(".naveps .nvsc a .tex").text()?.trim()
        },
        next: {
          url: $(".naveps .nvs .nolink").length ? null : $('.naveps .nvs a[rel="next"]').attr("href"),
          text: $(".naveps .nvs .nolink .tex").text()?.trim() || "Next"
        }
      };
      const detail = {
        title: title || "Unknown",
        image: image || null,
        imageMeta: imageMeta.url ? imageMeta : null,
        episodeInfo: {
          number: episodeNumber || "Unknown",
          type: episodeType || "Unknown",
          subtitle: subtitleInfo || null
        },
        releaseInfo: {
          text: releaseInfo || null,
          date: releaseDate || null,
          series: {
            name: seriesName || null,
            url: seriesUrl || null
          }
        },
        socialMedia: socialMedia,
        episodes: episodes,
        navigation: navigation,
        totalEpisodes: episodes?.length || 0,
        url: url,
        ...rest
      };
      console.log(`✅ Found ${episodes.length} episodes for "${title}"`);
      return detail;
    } catch (error) {
      console.error("❌ Detail error:", error.message);
      throw new Error(`Detail fetch failed: ${error.message}`);
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`📥 Fetching download links: ${url}`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const title = $(".entry-title").text()?.trim();
      const episodeNumber = $('meta[itemprop="episodeNumber"]').attr("content");
      const servers = [];
      $(".mirror option").each((index, element) => {
        const $el = $(element);
        const serverName = $el.text()?.trim();
        const embedCode = $el.attr("value");
        const dataIndex = $el.attr("data-index");
        if (serverName && embedCode && serverName !== "Pilih Server Streaming") {
          let iframeSrc = null;
          if (embedCode) {
            try {
              const decoded = Buffer.from(embedCode, "base64").toString("utf8");
              const srcMatch = decoded.match(/src="([^"]*)"/) || decoded.match(/src='([^']*)'/);
              iframeSrc = srcMatch ? srcMatch[1] : null;
            } catch (e) {
              console.log("Could not decode embed code");
            }
          }
          servers.push({
            index: parseInt(dataIndex) || index,
            name: serverName,
            embedCode: embedCode || null,
            iframeSrc: iframeSrc,
            rawEmbed: embedCode
          });
        }
      });
      const downloadLinks = [];
      $(".soraddlx").each((index, element) => {
        const $el = $(element);
        const sectionTitle = $el.find(".sorattlx h3").text()?.trim();
        $el.find(".soraurlx").each((i, downloadEl) => {
          const $download = $(downloadEl);
          const serverType = $download.find("strong").text()?.trim();
          $download.find("a").each((j, link) => {
            const $link = $(link);
            const linkUrl = $link.attr("href");
            const linkText = $link.text()?.trim();
            const target = $link.attr("target");
            if (linkUrl && linkText) {
              downloadLinks.push({
                section: sectionTitle || "Download Links",
                server: serverType || "Unknown",
                quality: linkText,
                url: linkUrl.startsWith("//") ? `https:${linkUrl}` : linkUrl,
                target: target || "_blank"
              });
            }
          });
        });
      });
      const videoPlayer = {
        embedHolder: $("#embed_holder").length > 0,
        playerEmbed: $("#pembed").length > 0,
        iframeSrc: $("#pembed iframe").attr("data-lazy-src") || $("#pembed iframe").attr("src")
      };
      const playerControls = {
        expand: $(".icol.expand").text()?.trim(),
        light: $(".icol.light").text()?.trim()
      };
      const ads = [];
      $(".kln a").each((index, element) => {
        const $el = $(element);
        ads.push({
          url: $el.attr("href"),
          image: $el.find("img").attr("data-lazy-src") || $el.find("img").attr("src"),
          alt: $el.find("img").attr("alt")
        });
      });
      const result = {
        title: title || "Unknown",
        episodeNumber: episodeNumber || null,
        streamingServers: servers,
        downloadLinks: downloadLinks,
        videoPlayer: videoPlayer,
        playerControls: playerControls,
        ads: ads.length > 0 ? ads : null,
        url: url,
        ...rest
      };
      console.log(`✅ Found ${servers.length} streaming servers and ${downloadLinks.length} download links`);
      return result;
    } catch (error) {
      console.error("❌ Download error:", error.message);
      throw new Error(`Download fetch failed: ${error.message}`);
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
  const api = new AnimeScraper();
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
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}