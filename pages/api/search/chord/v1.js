import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class ChordTela {
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
      console.log(`[LOG] 🔍 Searching ChordTela for: "${query}"`);
      const searchPageUrl = `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(query)}`;
      console.log(`[LOG] 📄 Loading search page...`);
      const pageProxyUrl = this.buildUrl(searchPageUrl);
      const pageRes = await axios.get(pageProxyUrl, {
        headers: this.baseHeaders,
        ...rest
      });
      const $ = cheerio.load(pageRes.data);
      const cseScriptUrl = $('script[src*="cse.google.com/cse.js"]').attr("src");
      if (!cseScriptUrl) {
        throw new Error("Google CSE script not found on page");
      }
      const cxMatch = cseScriptUrl.match(/cx=([^&]+)/);
      const cx = cxMatch ? cxMatch[1] : null;
      if (!cx) {
        throw new Error("Failed to extract CX ID from CSE script");
      }
      console.log(`[LOG] 🔑 CX ID: ${cx}`);
      console.log(`[LOG] 🔓 Fetching CSE configuration...`);
      const cseJsProxyUrl = this.buildUrl(cseScriptUrl);
      const jsRes = await axios.get(cseJsProxyUrl);
      const jsBody = jsRes.data;
      const cseToken = jsBody.match(/"cse_token"\s*:\s*"([^"]+)"/)?.[1];
      const cseLibV = jsBody.match(/"cselibVersion"\s*:\s*"([^"]+)"/)?.[1];
      if (!cseToken) {
        throw new Error("Failed to extract cse_token from JS file");
      }
      console.log(`[LOG] 🔑 Token: ${cseToken} | Version: ${cseLibV}`);
      console.log(`[LOG] ☁️ Calling Google CSE API...`);
      const apiParams = {
        rsz: "filtered_cse",
        num: 10,
        hl: "id",
        source: "gcsc",
        gss: ".br",
        cselibv: cseLibV || "f71e4ed980f4c082",
        cx: cx,
        q: query,
        safe: "active",
        cse_tok: cseToken,
        exp: "cc,apo",
        callback: "google.search.cse.api1",
        rurl: searchPageUrl
      };
      const apiUrl = "https://cse.google.com/cse/element/v1?" + Object.entries(apiParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const apiProxyUrl = this.buildUrl(apiUrl);
      const apiRes = await axios.get(apiProxyUrl);
      const rawBody = apiRes.data;
      const jsonStr = rawBody.replace(/^\/\*.*?\*\/\s*google\.search\.cse\.api1\(/, "").replace(/\);?\s*$/, "");
      let jsonData;
      try {
        jsonData = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error("Failed to parse JSON response from Google CSE");
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
      console.log(`[LOG] 🚀 Fetching ChordTela detail: ${url}`);
      const proxyUrl = this.buildUrl(url);
      const response = await axios.get(proxyUrl, {
        headers: this.baseHeaders,
        ...rest
      });
      const $ = cheerio.load(response.data);
      const title = $("h1.post-title, h1.entry-title").first().text()?.trim() || $("title").text()?.replace(/\s*\|\s*.*$/, "").trim() || "No Title";
      let artist = "Unknown";
      let song_title = title;
      const titleMatch = title.match(/(?:Chord|Kunci Gitar)\s+(.+?)\s+-\s+(.+?)(?:\s+Chord|\s+Kunci)?$/i);
      if (titleMatch) {
        artist = titleMatch[1].trim();
        song_title = titleMatch[2].trim();
      }
      const breadcrumbs = $(".breadcrumb .breadcrumb-item, .breadcrumb span").map((i, el) => $(el).text().trim()).get().filter(text => text && !text.includes("›") && !text.includes("Home"));
      let published_date = null;
      published_date = $("time[datetime]").attr("datetime");
      if (!published_date) {
        published_date = $("time[datetime]").text()?.trim();
      }
      if (!published_date) {
        published_date = $(".post-date, .entry-date, .published").text()?.trim();
      }
      if (!published_date) {
        published_date = $('meta[property="article:published_time"]').attr("content");
      }
      if (!published_date) {
        const jsonLd = $('script[type="application/ld+json"]').html();
        if (jsonLd) {
          try {
            const schema = JSON.parse(jsonLd);
            if (schema.datePublished) {
              published_date = schema.datePublished;
            } else if (schema["@graph"]) {
              const article = schema["@graph"].find(item => item["@type"] === "WebPage");
              if (article?.datePublished) {
                published_date = article.datePublished;
              }
            }
          } catch (e) {}
        }
      }
      published_date = published_date || null;
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
      $(".tbi-tooltip").each((i, el) => {
        const chord_name = $(el).text()?.trim();
        if (chord_name && !chords_used.includes(chord_name)) {
          chords_used.push(chord_name);
        }
      });
      if (chords_used.length === 0) {
        $('a[class*="chord"], span[class*="chord"], .chord-name, .chord-item').each((i, el) => {
          const chord_name = $(el).text()?.trim();
          if (chord_name && /^[A-G]/.test(chord_name) && !chords_used.includes(chord_name)) {
            chords_used.push(chord_name);
          }
        });
      }
      if (chords_used.length === 0) {
        const chordBody = $(".post pre, .telabox, .entry-content pre, .post-body").text();
        const chordPattern = /\b([A-G](?:#|b)?(?:m|maj|min|aug|dim|sus)?[0-9]?(?:\/[A-G](?:#|b)?)?)\b/g;
        const matches = chordBody.match(chordPattern) || [];
        const falsePositives = ["Intro", "Chorus", "Outro", "Verse", "Bridge", "Capo", "Interlude", "Reff"];
        const validChords = matches.filter(chord => /^[A-G]/.test(chord) && !falsePositives.includes(chord));
        validChords.forEach(chord => {
          if (!chords_used.includes(chord)) {
            chords_used.push(chord);
          }
        });
      }
      const related_songs = [];
      $('.widget_recent_entries ul li a, .sidebar a[title*="Chord"], .related-posts a').each((i, el) => {
        const rel_title = $(el).text()?.trim();
        const rel_url = $(el).attr("href");
        if (rel_title && rel_url && rel_url.includes("chordtela.com")) {
          related_songs.push({
            title: rel_title,
            url: rel_url
          });
        }
      });
      const content_area = $(".post, .entry-content, .blog-posts, .post-body").clone();
      const junk_selectors = ["script", "style", "iframe", "noscript", ".gcse-search", ".breadcrumb", ".post-title", "h1", "h2", "h3", ".post-footer", ".share-container", ".widget", ".sidebar", ".navigation", ".advertisement", ".menusearch", '[id*="ads"]', '[class*="ads"]', '[id*="ats"]', '[id*="speed"]', ".footer", "#footer", ".related", "form", "input", "button", ".post-date", '[class*="comment"]', '[id*="comment"]'];
      junk_selectors.forEach(sel => content_area.find(sel).remove());
      let chord_body = "";
      const preElement = content_area.find("pre, .telabox, .chord-content");
      if (preElement.length > 0) {
        chord_body = preElement.first().text();
      } else {
        chord_body = content_area.text();
      }
      chord_body = chord_body.replace(/\r\n/g, "\n").replace(/\n\s*\n\s*\n+/g, "\n\n").replace(/^[\s\n]+/, "").replace(/[\s\n]+$/, "").trim();
      chord_body = chord_body.replace(/Lihat Juga[\s\S]*$/i, "").replace(/Chord Terbaru[\s\S]*$/i, "").replace(/Mainkan Chord Ini[\s\S]*$/i, "").replace(/Chord Pilihan[\s\S]*$/i, "").replace(/About Us[\s\S]*$/i, "").replace(/Copyright[\s\S]*$/i, "").trim();
      console.log(`[LOG] ✅ ChordTela extraction complete`);
      return {
        status: true,
        result: {
          info: {
            title: song_title,
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
            chord_count: chords_used.length
          },
          content: {
            body: chord_body || "Chord content is empty"
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
  const api = new ChordTela();
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