import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class JRChord {
  constructor() {
    this.corsProxy = proxy;
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.baseHeaders = {
      "User-Agent": this.userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "id-ID"
    };
  }
  buildUrl(url) {
    return `${this.corsProxy}${encodeURIComponent(url)}`;
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log(`[LOG] 🔍 Searching JRChord for: "${query}"`);
      const searchPageUrl = `https://www.jrchord.com/search?q=${encodeURIComponent(query)}`;
      console.log(`[LOG] 📄 Loading search page...`);
      const pageProxyUrl = this.buildUrl(searchPageUrl);
      const pageRes = await axios.get(pageProxyUrl, {
        headers: this.baseHeaders,
        ...rest
      });
      const $ = cheerio.load(pageRes.data);
      const cseScriptUrl = $('script[src*="cse.google.com/cse.js"]').attr("src");
      if (!cseScriptUrl) {
        throw new Error("Google CSE script not found");
      }
      const cxMatch = cseScriptUrl.match(/cx=([^&"']+)/);
      const cx = cxMatch ? cxMatch[1] : null;
      if (!cx) {
        throw new Error("Failed to extract CX ID");
      }
      console.log(`[LOG] 🔑 CX ID: ${cx}`);
      console.log(`[LOG] 🔓 Fetching CSE configuration...`);
      const cseJsProxyUrl = this.buildUrl(cseScriptUrl);
      const jsRes = await axios.get(cseJsProxyUrl);
      const jsBody = jsRes.data;
      const cseToken = jsBody.match(/"cse_token"\s*:\s*"([^"]+)"/)?.[1];
      const cseLibV = jsBody.match(/"cselibVersion"\s*:\s*"([^"]+)"/)?.[1];
      if (!cseToken) {
        throw new Error("Failed to extract cse_token");
      }
      console.log(`[LOG] 🔑 Token: ${cseToken} | Version: ${cseLibV}`);
      console.log(`[LOG] ☁️ Calling Google CSE API...`);
      const apiParams = {
        rsz: "filtered_cse",
        num: 10,
        hl: "id",
        source: "gcsc",
        cselibv: cseLibV || "f71e4ed980f4c082",
        cx: cx,
        q: query,
        safe: "off",
        cse_tok: cseToken,
        lr: "",
        cr: "",
        gl: "",
        filter: "0",
        sort: "",
        as_oq: "",
        as_sitesearch: "",
        exp: "cc",
        callback: "google.search.cse.api6622",
        rurl: searchPageUrl
      };
      const apiUrl = "https://cse.google.com/cse/element/v1?" + Object.entries(apiParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const apiProxyUrl = this.buildUrl(apiUrl);
      const apiRes = await axios.get(apiProxyUrl);
      const rawBody = apiRes.data;
      const jsonStr = rawBody.replace(/^\/\*.*?\*\/\s*google\.search\.cse\.api\d+\(/, "").replace(/\);?\s*$/, "");
      let jsonData;
      try {
        jsonData = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("Failed to parse Google CSE response");
      }
      const items = jsonData.results || [];
      const results = items.map(item => ({
        title: item.titleNoFormatting || item.title?.text || "No Title",
        url: item.unescapedUrl || item.url || "",
        snippet: item.contentNoFormatting || item.content || "",
        thumbnail_url: item.richSnippet?.cseImage?.[0]?.src || item.richSnippet?.metatags?.ogImage || null,
        published_time: item.richSnippet?.metatags?.articlePublishedTime || null
      }));
      console.log(`[LOG] ✅ Found ${results.length} results`);
      return {
        status: true,
        data: results,
        query: query,
        total_results: results.length,
        search_url: searchPageUrl
      };
    } catch (error) {
      console.error(`[ERROR] ❌ Search Error:`, error?.message);
      return {
        status: false,
        data: [],
        error: error?.message
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    try {
      console.log(`[LOG] 🚀 Fetching JRChord detail: ${url}`);
      const proxyUrl = this.buildUrl(url);
      const response = await axios.get(proxyUrl, {
        headers: this.baseHeaders,
        ...rest
      });
      const $ = cheerio.load(response.data);
      const title = $(".song-detail-title").text()?.trim() || $("h1").first().text()?.trim() || "No Title";
      const artist = $(".song-detail-artist").text()?.trim() || "Unknown";
      const breadcrumbs = [];
      $('script[type="application/ld+json"]').each((i, el) => {
        const jsonLd = $(el).html();
        if (jsonLd && jsonLd.includes("BreadcrumbList")) {
          try {
            const schema = JSON.parse(jsonLd);
            const breadcrumbList = schema["@graph"]?.find(item => item["@type"] === "BreadcrumbList");
            if (breadcrumbList?.itemListElement) {
              breadcrumbList.itemListElement.forEach(item => {
                if (item.name && item.name !== "Home") {
                  breadcrumbs.push(item.name);
                }
              });
            }
          } catch (e) {}
        }
      });
      let published_date = null;
      $('script[type="application/ld+json"]').each((i, el) => {
        const jsonLd = $(el).html();
        if (jsonLd) {
          try {
            const schema = JSON.parse(jsonLd);
            const webpage = schema["@graph"]?.find(item => item["@type"] === "WebPage");
            if (webpage?.datePublished) {
              published_date = webpage.datePublished;
            }
          } catch (e) {}
        }
      });
      if (!published_date) {
        published_date = $('meta[property="article:published_time"]').attr("content") || $("time[datetime]").attr("datetime") || $(".entry-date").text()?.trim();
      }
      let youtube_url = null;
      let youtube_thumbnail = null;
      const iframe = $('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').first();
      if (iframe.length) {
        const iframeSrc = iframe.attr("src");
        const ytIdMatch = iframeSrc.match(/(?:embed\/|v=)([a-zA-Z0-9_-]{11})/);
        if (ytIdMatch) {
          const ytId = ytIdMatch[1];
          youtube_url = `https://www.youtube.com/watch?v=${ytId}`;
          youtube_thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        }
      }
      if (!youtube_url) {
        const ytLink = $('a[href*="youtube.com"], a[href*="youtu.be"]').first();
        if (ytLink.length) {
          const href = ytLink.attr("href");
          const ytIdMatch = href.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (ytIdMatch) {
            const ytId = ytIdMatch[1];
            youtube_url = `https://www.youtube.com/watch?v=${ytId}`;
            youtube_thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
          }
        }
      }
      const chords_used = [];
      const chordBody = $("pre").text();
      if (chordBody) {
        const chordPattern = /\b([A-G](?:#|b)?(?:m|maj|min|aug|dim|sus)?[0-9]?(?:\/[A-G](?:#|b)?)?)\b/g;
        const matches = chordBody.match(chordPattern) || [];
        const falsePositives = ["Intro", "Chorus", "Outro", "Verse", "Bridge", "Capo", "Interlude", "Reff", "Bait"];
        const validChords = matches.filter(chord => /^[A-G]/.test(chord) && !falsePositives.includes(chord));
        validChords.forEach(chord => {
          if (!chords_used.includes(chord)) {
            chords_used.push(chord);
          }
        });
      }
      const related_songs = [];
      $(".song a, .sidebar-wrapper .song a").each((i, el) => {
        const rel_title = $(el).find(".song-title").text()?.trim();
        const rel_artist = $(el).find(".song-artist").text()?.trim();
        const rel_url = $(el).attr("href");
        if (rel_title && rel_url) {
          related_songs.push({
            title: rel_title,
            artist: rel_artist || "Unknown",
            url: rel_url.startsWith("http") ? rel_url : `https://www.jrchord.com${rel_url}`
          });
        }
      });
      let chord_content = "";
      const preElement = $("pre[data-key]");
      if (preElement.length > 0) {
        chord_content = preElement.text();
      } else {
        chord_content = $("pre").first().text();
      }
      chord_content = chord_content.replace(/\r\n/g, "\n").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
      const titlePattern = new RegExp(`^Chord\\s+${title}.*?\\n\\n?`, "i");
      chord_content = chord_content.replace(titlePattern, "").trim();
      console.log(`[LOG] ✅ JRChord extraction complete`);
      return {
        status: true,
        result: {
          info: {
            title: title,
            artist: artist,
            published_date: published_date,
            breadcrumbs: breadcrumbs,
            original_url: url
          },
          media: {
            youtube_url: youtube_url,
            youtube_thumbnail: youtube_thumbnail,
            has_video: !!youtube_url
          },
          music_data: {
            chords_used: chords_used.length > 0 ? chords_used : null,
            chord_count: chords_used.length,
            original_key: $("pre[data-key]").attr("data-key") || null
          },
          content: {
            body: chord_content || "Chord content is empty"
          },
          related: {
            total: related_songs.length,
            songs: related_songs.slice(0, 5)
          }
        }
      };
    } catch (error) {
      console.error(`[ERROR] ❌ Detail Error:`, error?.message);
      return {
        status: false,
        result: null,
        error: error?.message
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
      error: "Parameter 'action' wajib diisi.",
      actions: ["search", "detail"]
    });
  }
  const api = new JRChord();
  try {
    let response;
    switch (action) {
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
          valid_actions: ["search", "detail"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}