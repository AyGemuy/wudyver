import axios from "axios";
import * as cheerio from "cheerio";
class NCSScraper {
  constructor(options = {}) {
    this.config = {
      baseUrl: options.baseUrl || "https://ncs.io",
      timeout: options.timeout || 3e4,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1e3,
      endpoint: {
        home: "/?display=list&page=1",
        search: "/music-search",
        trackInfo: "/track/info",
        trackDownload: "/track/download"
      }
    };
    this.validGenres = {};
    this.validMoods = {};
    this._initialized = false;
    console.log("NCS Scraper initialized");
  }
  async _request(url, options = {}) {
    const {
      retryAttempts,
      retryDelay,
      timeout
    } = this.config;
    let lastError;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: timeout,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            ...options.headers
          },
          ...options
        });
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`Request attempt ${attempt}/${retryAttempts} failed:`, error.message);
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    throw lastError;
  }
  async _initialize() {
    if (this._initialized) return;
    try {
      console.log("Parsing genres and moods from website...");
      const {
        data
      } = await this._request(`${this.config.baseUrl}/music-search`);
      const $ = cheerio.load(data);
      $("select[name='genre'] option").each((_, el) => {
        const $el = $(el);
        const value = $el.attr("value");
        const name = $el.text().trim();
        if (value && name && name !== "Search Genres") {
          this.validGenres[value] = name;
        }
      });
      $("select[name='mood'] option").each((_, el) => {
        const $el = $(el);
        const value = $el.attr("value");
        const name = $el.text().trim();
        if (value && name && name !== "Search Moods") {
          this.validMoods[value] = name;
        }
      });
      this._initialized = true;
      console.log(`Parsed ${Object.keys(this.validGenres).length} genres and ${Object.keys(this.validMoods).length} moods`);
    } catch (error) {
      console.error("Error initializing genres/moods:", error.message);
      this._initialized = true;
    }
  }
  async getGenres() {
    await this._initialize();
    return Object.entries(this.validGenres).map(([id, name]) => ({
      id: id,
      name: name
    }));
  }
  async getMoods() {
    await this._initialize();
    return Object.entries(this.validMoods).map(([id, name]) => ({
      id: id,
      name: name
    }));
  }
  async validateParam(type, value) {
    await this._initialize();
    const validList = type === "genre" ? this.validGenres : this.validMoods;
    return value && validList[value] ? String(value) : "";
  }
  _parseGenresAndMoods($) {
    const genres = [];
    const moods = [];
    try {
      $("select[name='genre'] option").each((_, el) => {
        const $el = $(el);
        const value = $el.attr("value");
        const name = $el.text().trim();
        if (value && name && name !== "Search Genres") {
          genres.push({
            id: value,
            name: name
          });
          if (!this.validGenres[value]) {
            this.validGenres[value] = name;
          }
        }
      });
      $("select[name='mood'] option").each((_, el) => {
        const $el = $(el);
        const value = $el.attr("value");
        const name = $el.text().trim();
        if (value && name && name !== "Search Moods") {
          moods.push({
            id: value,
            name: name
          });
          if (!this.validMoods[value]) {
            this.validMoods[value] = name;
          }
        }
      });
    } catch (error) {
      console.error("Error parsing genres/moods:", error.message);
    }
    return {
      genres: genres,
      moods: moods
    };
  }
  async home({
    page = 1,
    display = "list",
    limit,
    ...rest
  } = {}) {
    try {
      console.log(`Fetching home page ${page}...`);
      const {
        data
      } = await this._request(`${this.config.baseUrl}/?display=${display}&page=${page}`, rest);
      const $ = cheerio.load(data);
      const tracks = [];
      const {
        genres,
        moods
      } = this._parseGenresAndMoods($);
      $("tbody tr[role='row']").each((_, el) => {
        const $el = $(el);
        const track = this._parseTrackRow($el, $);
        if (track) tracks.push(track);
      });
      $(".featured-tracks .item").each((_, el) => {
        const $el = $(el);
        const track = this._parseGridTrack($el, $);
        if (track) tracks.push(track);
      });
      const limitedTracks = limit && limit > 0 ? tracks.slice(0, limit) : tracks;
      console.log(`Fetched ${limitedTracks.length} tracks from home page${limit ? ` (limited to ${limit})` : ""}`);
      return {
        success: true,
        tracks: limitedTracks,
        total: tracks.length,
        returned: limitedTracks.length,
        genres: genres,
        moods: moods,
        page: page,
        display: display,
        ...limit && {
          limit: limit
        }
      };
    } catch (error) {
      console.error("Error fetching home page:", error.message);
      return {
        success: false,
        error: error.message,
        tracks: [],
        total: 0,
        returned: 0,
        genres: [],
        moods: [],
        page: 1,
        display: "list"
      };
    }
  }
  async search({
    q = "",
    query = "",
    genre = "",
    mood = "",
    page = 1,
    limit,
    ...rest
  } = {}) {
    try {
      const searchQuery = q || query;
      if (!searchQuery) {
        console.warn("Search query is empty");
      }
      console.log(`Searching for: ${searchQuery}, genre: ${genre}, mood: ${mood}${limit ? `, limit: ${limit}` : ""}`);
      const validGenre = await this.validateParam("genre", genre);
      const validMood = await this.validateParam("mood", mood);
      const params = new URLSearchParams({
        q: searchQuery,
        ...validGenre && {
          genre: validGenre
        },
        ...validMood && {
          mood: validMood
        }
      });
      const url = `${this.config.baseUrl}/music-search?${params.toString()}`;
      const {
        data
      } = await this._request(url, rest);
      const $ = cheerio.load(data);
      const tracks = [];
      const {
        genres: availableGenres,
        moods: availableMoods
      } = this._parseGenresAndMoods($);
      $("table.tablesorter tbody tr").each((_, el) => {
        const $row = $(el);
        const track = this._parseSearchTrack($row, $);
        if (track) tracks.push(track);
      });
      const limitedTracks = limit && limit > 0 ? tracks.slice(0, limit) : tracks;
      console.log(`Found ${limitedTracks.length} tracks${limit ? ` (limited to ${limit})` : ""}`);
      return {
        success: true,
        tracks: limitedTracks,
        total: tracks.length,
        returned: limitedTracks.length,
        searchQuery: searchQuery,
        selectedGenre: validGenre ? {
          id: validGenre,
          name: this.validGenres[validGenre]
        } : null,
        selectedMood: validMood ? {
          id: validMood,
          name: this.validMoods[validMood]
        } : null,
        availableGenres: availableGenres,
        availableMoods: availableMoods,
        page: page,
        ...limit && {
          limit: limit
        }
      };
    } catch (error) {
      console.error(`Error searching:`, error.message);
      return {
        success: false,
        error: error.message,
        tracks: [],
        total: 0,
        returned: 0,
        searchQuery: q || query,
        selectedGenre: null,
        selectedMood: null,
        availableGenres: [],
        availableMoods: [],
        page: 1
      };
    }
  }
  _parseSearchTrack($row, $) {
    try {
      const $play = $row.find(".player-play");
      if (!$play.length) return null;
      const tid = $play.attr("data-tid") || "";
      const title = $play.attr("data-track") || "";
      const artist = $play.attr("data-artistraw") || "";
      const versions = $play.attr("data-versions") || "";
      const genreTrack = $play.attr("data-genre") || "";
      const previewUrl = $play.attr("data-url") || "";
      const previewStart = $play.attr("data-preview") || "0";
      const cover = $play.attr("data-cover") || "";
      const image = $row.find("td img[alt]").attr("src") || cover;
      const genres = [];
      const moods = [];
      $row.find("td:nth-child(5) a.tag").each((_, tag) => {
        const $tag = $(tag);
        const text = $tag.text().trim();
        const href = $tag.attr("href") || "";
        const color = $tag.attr("style")?.match(/background-color:\s*(#?[\w]+)/)?.[1] || "";
        if (href.includes("genre=")) {
          const genreId = href.match(/genre=(\d+)/)?.[1];
          genres.push({
            id: genreId,
            name: text,
            color: color
          });
        } else if (href.includes("mood=")) {
          const moodId = href.match(/mood=(\d+)/)?.[1];
          moods.push({
            id: moodId,
            name: text,
            color: color
          });
        }
      });
      const releaseDate = $row.find("td:nth-child(6)").text().trim();
      const slug = $row.find("td a[href^='/']").first().attr("href")?.replace("/", "") || "";
      if (!tid || !title) return null;
      return {
        tid: tid,
        title: title,
        artist: artist,
        versions: versions.split(",").map(v => v.trim()).filter(Boolean),
        genre: genreTrack,
        image: image,
        cover: cover,
        genres: genres,
        moods: moods,
        previewUrl: previewUrl,
        previewStart: parseInt(previewStart) || 0,
        releaseDate: releaseDate,
        slug: slug,
        url: slug ? `${this.config.baseUrl}/${slug}` : ""
      };
    } catch (error) {
      console.error("Error parsing search track:", error.message);
      return null;
    }
  }
  async getDownloadInfo({
    tid,
    trackId,
    ...rest
  } = {}) {
    const id = tid || trackId;
    if (!id) {
      console.error("Track ID is required");
      return null;
    }
    try {
      console.log(`Fetching download info for TID: ${id}`);
      const {
        data
      } = await this._request(`${this.config.baseUrl}/track/info/${id}`, {
        headers: {
          Referer: `${this.config.baseUrl}/music-search`
        },
        ...rest
      });
      const $ = cheerio.load(data);
      const info = {
        success: true,
        tid: id,
        title: "",
        artist: "",
        genre: "",
        version: "",
        downloadUrl: "",
        imageUrl: "",
        copyText: "",
        attribution: ""
      };
      const $h5 = $("h5");
      if ($h5.length) {
        info.title = $h5.contents().first().text().trim();
        info.artist = $h5.find("span").text().trim();
      }
      const $btn = $("a.btn.black[href*='/track/download/']");
      if ($btn.length) {
        info.genre = $btn.attr("data-genre") || "";
        info.version = $btn.attr("data-version") || "";
        const downloadPath = $btn.attr("href");
        info.downloadUrl = downloadPath ? `${this.config.baseUrl}${downloadPath}` : "";
      }
      const style = $(".cover .img").attr("style") || "";
      const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match) info.imageUrl = match[1];
      info.copyText = $("#panel-copy").text().trim();
      info.attribution = $("#panel-copy2").html()?.replace(/<br\s*\/?>/g, "\n").trim() || info.copyText;
      console.log(`Successfully fetched info for: ${info.title}`);
      return info;
    } catch (error) {
      console.error(`Error fetching download info for ${id}:`, error.message);
      return {
        success: false,
        error: error.message,
        tid: id
      };
    }
  }
  async download({
    tid,
    trackId,
    ...rest
  } = {}) {
    const id = tid || trackId;
    if (!id) {
      console.error("Track ID is required");
      return {
        success: false,
        error: "Track ID is required"
      };
    }
    try {
      console.log(`Preparing download for TID: ${id}`);
      const info = await this.getDownloadInfo({
        tid: id,
        ...rest
      });
      if (!info || !info.success) {
        throw new Error("Failed to get download info");
      }
      const downloadUrl = info.downloadUrl || `${this.config.baseUrl}/track/download/${id}`;
      const safeTitle = (info.title || "Unknown").replace(/[/\\?%*:|"<>]/g, "-");
      const safeArtist = (info.artist || "Unknown").replace(/[/\\?%*:|"<>]/g, "-");
      return {
        success: true,
        tid: info.tid,
        title: info.title,
        artist: info.artist,
        genre: info.genre,
        version: info.version,
        downloadUrl: downloadUrl,
        imageUrl: info.imageUrl,
        attribution: info.attribution,
        filename: `${safeArtist} - ${safeTitle}.mp3`
      };
    } catch (error) {
      console.error(`Error preparing download for ${id}:`, error.message);
      return {
        success: false,
        error: error.message,
        tid: id
      };
    }
  }
  async detail({
    slug,
    url,
    ...rest
  } = {}) {
    if (!slug && !url) {
      console.error("Slug or URL is required");
      return {
        success: false,
        error: "Slug or URL is required"
      };
    }
    try {
      const trackSlug = slug || (url ? url.split("/").pop() : "");
      console.log(`Fetching details for: ${trackSlug}`);
      const trackUrl = url || `${this.config.baseUrl}/${trackSlug}`;
      const {
        data
      } = await this._request(trackUrl, rest);
      const $ = cheerio.load(data);
      const title = $("h2").first().contents().first().text().trim();
      const artists = [];
      $("h2 span a").each((_, el) => {
        const artist = $(el).text().trim();
        const artistUrl = $(el).attr("href");
        if (artist) {
          artists.push({
            name: artist,
            url: artistUrl ? `${this.config.baseUrl}${artistUrl}` : ""
          });
        }
      });
      const trackId = $("#player").attr("data-tid") || "";
      const audioUrl = $("#player").attr("data-url") || "";
      let coverImage = "";
      const bgStyle = $(".blurred-img").attr("style");
      if (bgStyle) {
        const match = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match) coverImage = match[1];
      }
      if (!coverImage) {
        const imgStyle = $(".img.wrap_image").attr("style");
        if (imgStyle) {
          const match = imgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match) coverImage = match[1];
        }
      }
      const downloadLink = $("a[href*='/track/download/']").attr("href") || "";
      const downloadUrl = downloadLink ? `${this.config.baseUrl}${downloadLink}` : "";
      const attribution = $("#panel-copy2").html()?.replace(/<br\s*\/?>/g, "\n").trim() || "";
      const linkfireUrl = $("iframe[data-lnk-widget]").attr("src") || "";
      const tags = [];
      $(".track-copy a.tag, .attribution a.tag").each((_, el) => {
        const $tag = $(el);
        const tagUrl = $tag.attr("href") || "";
        const tagName = $tag.text().trim();
        const tagColor = $tag.attr("style")?.match(/background-color:\s*(#?[\w]+)/)?.[1] || "";
        let tagId = "";
        let tagType = "";
        if (tagUrl.includes("genre=")) {
          tagId = tagUrl.match(/genre=(\d+)/)?.[1] || "";
          tagType = "genre";
        } else if (tagUrl.includes("mood=")) {
          tagId = tagUrl.match(/mood=(\d+)/)?.[1] || "";
          tagType = "mood";
        }
        if (tagName) {
          tags.push({
            id: tagId,
            name: tagName,
            color: tagColor,
            url: tagUrl,
            type: tagType
          });
        }
      });
      const genreTag = tags.find(t => t.type === "genre");
      const genre = genreTag ? genreTag.name : "";
      let releaseDate = "";
      const dateMatch = attribution.match(/(\d{1,2}\s+\w+\s+\d{4})/);
      if (dateMatch) releaseDate = dateMatch[0];
      console.log(`Fetched details for: ${title}`);
      return {
        success: true,
        title: title,
        artists: artists,
        trackId: trackId,
        audioUrl: audioUrl,
        coverImage: coverImage,
        downloadUrl: downloadUrl,
        attribution: attribution,
        linkfireUrl: linkfireUrl,
        tags: tags,
        genre: genre,
        releaseDate: releaseDate,
        slug: trackSlug,
        fullUrl: trackUrl
      };
    } catch (error) {
      console.error(`Error fetching details:`, error.message);
      return {
        success: false,
        error: error.message,
        slug: slug || "",
        fullUrl: url || ""
      };
    }
  }
  async completeScraping({
    q = "",
    query = "",
    genre = "",
    mood = "",
    limit,
    delayMs = 300,
    stopOnError = false,
    ...rest
  } = {}) {
    try {
      const searchQuery = q || query;
      console.log(`Complete scraping for: ${searchQuery}${limit ? ` (limit: ${limit})` : ""}`);
      const searchResults = await this.search({
        q: searchQuery,
        genre: genre,
        mood: mood,
        limit: limit,
        ...rest
      });
      if (!searchResults.success || searchResults.tracks.length === 0) {
        console.log("No tracks found");
        return {
          success: false,
          error: searchResults.error || "No tracks found",
          tracks: [],
          total: 0,
          processed: 0
        };
      }
      const results = [];
      let processed = 0;
      for (const track of searchResults.tracks) {
        try {
          const downloadInfo = await this.getDownloadInfo({
            tid: track.tid
          });
          results.push({
            ...track,
            downloadInfo: downloadInfo
          });
          processed++;
          console.log(`Processed ${processed}/${searchResults.tracks.length}: ${track.title}`);
        } catch (error) {
          console.error(`Error getting download info for ${track.tid}:`, error.message);
          if (stopOnError) {
            console.log("Stopping due to error (stopOnError=true)");
            break;
          }
          results.push({
            ...track,
            downloadInfo: {
              success: false,
              error: error.message
            }
          });
          processed++;
        }
        if (delayMs > 0 && processed < searchResults.tracks.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      console.log(`Complete scraping finished: ${results.length}/${searchResults.tracks.length} tracks processed`);
      return {
        success: true,
        tracks: results,
        total: searchResults.total,
        processed: results.length,
        ...limit && {
          limit: limit
        }
      };
    } catch (error) {
      console.error("Error in complete scraping:", error.message);
      return {
        success: false,
        error: error.message,
        tracks: [],
        total: 0,
        processed: 0
      };
    }
  }
  _parseTrackRow($el, $) {
    try {
      const title = $el.find("td a[href^='/']").first().text().trim();
      if (!title) return null;
      const slug = $el.find("td a[href^='/']").first().attr("href")?.replace("/", "") || "";
      const artists = $el.find("td span").first().text().trim();
      const genre = $el.find(".tag[href*='genre=']").text().trim();
      const genreColor = $el.find(".tag[href*='genre=']").attr("style")?.match(/background-color:\s*(#?[\w]+)/)?.[1] || "";
      const moods = [];
      $el.find(".tag[href*='mood=']").each((_, moodEl) => {
        const name = $(moodEl).text().trim();
        const color = $(moodEl).attr("style")?.match(/background-color:\s*(#?[\w]+)/)?.[1] || "";
        if (name) moods.push({
          name: name,
          color: color
        });
      });
      const releaseDate = $el.find("td").eq(5).text().trim();
      const versions = $el.find("td").eq(6).text().trim();
      const coverImage = $el.find("img").attr("src") || "";
      const audioUrl = $el.find(".player-play").attr("data-url") || "";
      const trackId = $el.find(".player-play").attr("data-tid") || "";
      const preview = $el.find(".player-play").attr("data-preview") || "0";
      return {
        title: title,
        slug: slug,
        artists: artists,
        genre: genre,
        genreColor: genreColor,
        moods: moods,
        releaseDate: releaseDate,
        versions: versions.split(",").map(v => v.trim()).filter(Boolean),
        coverImage: coverImage,
        audioUrl: audioUrl,
        trackId: trackId,
        preview: parseInt(preview) || 0,
        url: `${this.config.baseUrl}/${slug}`
      };
    } catch (error) {
      console.error("Error parsing track row:", error.message);
      return null;
    }
  }
  _parseGridTrack($el, $) {
    try {
      const title = $el.find("strong").text().trim();
      if (!title) return null;
      const slug = $el.find("a").first().attr("href")?.replace("/", "") || "";
      const artists = $el.find(".tags").text().trim();
      const releaseText = $el.find(".options p").attr("title") || "";
      const genre = $el.find(".options strong").text().trim();
      const coverImage = $el.find(".img").attr("style")?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1] || "";
      const audioUrl = $el.find(".player-play").attr("data-url") || "";
      const trackId = $el.find(".player-play").attr("data-tid") || "";
      const versions = $el.find(".player-play").attr("data-versions") || "";
      return {
        title: title,
        slug: slug,
        artists: artists,
        genre: genre,
        releaseDate: releaseText,
        versions: versions.split(",").map(v => v.trim()).filter(Boolean),
        coverImage: coverImage,
        audioUrl: audioUrl,
        trackId: trackId,
        url: `${this.config.baseUrl}/${slug}`
      };
    } catch (error) {
      console.error("Error parsing grid track:", error.message);
      return null;
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
      success: false,
      error: "Paramenter 'action' wajib diisi.",
      availableActions: ["home", "search", "detail", "getDownloadInfo", "download", "completeScraping", "getGenres", "getMoods"]
    });
  }
  const scraper = new NCSScraper({
    timeout: 3e4,
    retryAttempts: 3,
    retryDelay: 1e3
  });
  try {
    let response;
    switch (action) {
      case "home":
        response = await scraper.home({
          page: params.page ? parseInt(params.page) : 1,
          display: params.display || "list",
          limit: params.limit ? parseInt(params.limit) : undefined
        });
        break;
      case "search":
        if (!params.q && !params.query) {
          return res.status(400).json({
            success: false,
            error: "Paramenter 'q' atau 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await scraper.search({
          q: params.q || params.query,
          genre: params.genre,
          mood: params.mood,
          page: params.page ? parseInt(params.page) : 1,
          limit: params.limit ? parseInt(params.limit) : undefined
        });
        break;
      case "detail":
        if (!params.slug && !params.url) {
          return res.status(400).json({
            success: false,
            error: "Paramenter 'slug' atau 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await scraper.detail({
          slug: params.slug,
          url: params.url
        });
        break;
      case "getDownloadInfo":
        if (!params.tid && !params.trackId) {
          return res.status(400).json({
            success: false,
            error: "Paramenter 'tid' atau 'trackId' wajib diisi untuk action 'getDownloadInfo'."
          });
        }
        response = await scraper.getDownloadInfo({
          tid: params.tid || params.trackId
        });
        break;
      case "download":
        if (!params.tid && !params.trackId) {
          return res.status(400).json({
            success: false,
            error: "Paramenter 'tid' atau 'trackId' wajib diisi untuk action 'download'."
          });
        }
        response = await scraper.download({
          tid: params.tid || params.trackId
        });
        break;
      case "completeScraping":
        if (!params.q && !params.query) {
          return res.status(400).json({
            success: false,
            error: "Paramenter 'q' atau 'query' wajib diisi untuk action 'completeScraping'."
          });
        }
        response = await scraper.completeScraping({
          q: params.q || params.query,
          genre: params.genre,
          mood: params.mood,
          limit: params.limit ? parseInt(params.limit) : undefined,
          delayMs: params.delayMs ? parseInt(params.delayMs) : 300,
          stopOnError: params.stopOnError === "true" || params.stopOnError === true
        });
        break;
      case "getGenres":
        const genres = await scraper.getGenres();
        response = {
          success: true,
          genres: genres,
          total: genres.length
        };
        break;
      case "getMoods":
        const moods = await scraper.getMoods();
        response = {
          success: true,
          moods: moods,
          total: moods.length
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Action tidak valid: '${action}'.`,
          availableActions: ["home", "search", "detail", "getDownloadInfo", "download", "completeScraping", "getGenres", "getMoods"],
          examples: {
            home: "/api/ncs?action=home&page=1&limit=10",
            search: "/api/ncs?action=search&q=Royalty&genre=6&limit=5",
            detail: "/api/ncs?action=detail&slug=BUSSIN_R",
            getDownloadInfo: "/api/ncs?action=getDownloadInfo&tid=track-id",
            download: "/api/ncs?action=download&tid=track-id",
            completeScraping: "/api/ncs?action=completeScraping&q=Mortals&genre=26&limit=10",
            getGenres: "/api/ncs?action=getGenres",
            getMoods: "/api/ncs?action=getMoods"
          }
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal pada server.",
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}