import axios from "axios";
import * as cheerio from "cheerio";
class ChordIndonesia {
  constructor() {
    this.agent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.headers = {
      "User-Agent": this.agent,
      Accept: "*/*",
      "Accept-Language": "id-ID",
      Referer: "https://www.chordindonesia.com/",
      "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "script",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site"
    };
    this.cookie = [];
  }
  _handle(response) {
    const setCookie = response.headers["set-cookie"];
    if (setCookie) {
      setCookie.forEach(cookie => {
        const parts = cookie.split(";")[0];
        this.cookie.push(parts);
      });
    }
  }
  _cookie() {
    return [...new Set(this.cookie)].join("; ");
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log(`[LOG] 🔍 Searching for: "${query}"`);
      const searchPageUrl = `https://www.chordindonesia.com/hasil-pencarian-chord-kunci-gitar?q=${encodeURIComponent(query)}`;
      const pageRes = await axios.get(searchPageUrl, {
        headers: {
          ...this.headers,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin"
        },
        ...rest
      });
      this._handle(pageRes);
      const scriptUrlMatch = pageRes.data.match(/src=["'](https:\/\/cse\.google\.com\/cse\.js\?cx=[^"']+)["']/);
      const cseJsUrl = scriptUrlMatch?.[1];
      let cx = pageRes.data.match(/cx\s*:\s*["']([^"']+)["']/)?.[1];
      if (!cseJsUrl && !cx) {
        throw new Error("Failed to get Google CSE configuration");
      }
      console.log(`[LOG] 🔓 Getting token from CSE script...`);
      let cseToken = "";
      let cseLibV = "";
      if (cseJsUrl) {
        const jsRes = await axios.get(cseJsUrl, {
          headers: {
            ...this.headers,
            Referer: searchPageUrl,
            Cookie: this._cookie()
          }
        });
        this._handle(jsRes);
        const jsBody = jsRes.data;
        cseToken = jsBody.match(/"cse_token"\s*:\s*"([^"]+)"/)?.[1];
        cseLibV = jsBody.match(/"cselibVersion"\s*:\s*"([^"]+)"/)?.[1];
        if (!cx) cx = jsBody.match(/"cx"\s*:\s*"([^"]+)"/)?.[1];
      }
      if (!cseToken) {
        throw new Error("Failed to extract cse_token");
      }
      console.log(`[LOG] 🔑 Token: ${cseToken} | Ver: ${cseLibV} | CX: ${cx}`);
      console.log(`[LOG] ☁️ Requesting Google CSE API...`);
      const callbackName = "google.search.cse.api1";
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
        callback: callbackName,
        rurl: searchPageUrl
      };
      const apiRes = await axios.get("https://cse.google.com/cse/element/v1", {
        params: apiParams,
        headers: {
          ...this.headers,
          Referer: searchPageUrl,
          Cookie: this._cookie()
        }
      });
      const raw_body = apiRes.data;
      const json_str = raw_body.replace(/^\/\*.*?\*\/\s*google\.search\.cse\.api1\(/, "").replace(/\);?$/, "");
      let json_data;
      try {
        json_data = JSON.parse(json_str);
      } catch (e) {
        throw new Error("Failed to parse JSON response from Google");
      }
      const items = json_data.results || [];
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
        total_results: results.length
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
      console.log(`[LOG] 🚀 Fetching detail from: ${url}`);
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          Referer: "https://www.chordindonesia.com/"
        },
        ...rest
      });
      const $ = cheerio.load(response.data);
      const title = $("h1.entry-title").text()?.trim() || "No Title";
      const breadcrumbs = $(".breadcrumb .breadcrumb-item").map((i, el) => $(el).text().trim()).get().filter(text => text);
      const artist = breadcrumbs[1] || "Unknown";
      let published_date = null;
      published_date = $(".entry-date").first().text()?.trim();
      if (!published_date || published_date === "") {
        const timeEl = $("time[datetime]").first();
        published_date = timeEl.attr("datetime") || timeEl.text()?.trim();
      }
      if (!published_date || published_date === "") {
        published_date = $('meta[property="article:published_time"]').attr("content");
      }
      if (!published_date || published_date === "") {
        const entryMetaText = $(".entry-meta").text();
        const dateMatch = entryMetaText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
        if (dateMatch) {
          published_date = dateMatch[0];
        }
      }
      if (!published_date || published_date === "") {
        published_date = $(".post-date, .posted-on, .published").first().text()?.trim();
      }
      published_date = published_date || null;
      const yt_el = $(".rll-youtube-player");
      const yt_id = yt_el.attr("data-id");
      const youtube_url = yt_id ? `https://www.youtube.com/watch?v=${yt_id}` : null;
      const youtube_thumbnail = yt_el.attr("data-src") || yt_el.attr("data-lazy-src") || (yt_id ? `https://img.youtube.com/vi/${yt_id}/maxresdefault.jpg` : null);
      const chords_used = [];
      $(".tampil-chord-diagram .nama-chord > div:first-child").each((i, el) => {
        const chord_name = $(el).text()?.trim();
        if (chord_name && !chords_used.includes(chord_name)) {
          chords_used.push(chord_name);
        }
      });
      if (chords_used.length === 0) {
        $("span.showTip[data-chord]").each((i, el) => {
          const chord_name = $(el).attr("data-chord")?.trim();
          if (chord_name && !chords_used.includes(chord_name)) {
            chords_used.push(chord_name);
          }
        });
      }
      if (chords_used.length === 0) {
        $("span.showTip").each((i, el) => {
          const classes = $(el).attr("class")?.split(" ") || [];
          const chordClass = classes.find(cls => cls !== "showTip" && /^[A-G]/.test(cls));
          if (chordClass && !chords_used.includes(chordClass)) {
            chords_used.push(chordClass);
          }
        });
      }
      if (chords_used.length === 0) {
        const chordBodyText = $(".entry-content pre").text() || $(".entry-content").text();
        const chordPattern = /\b([A-G](?:#|b)?(?:m|maj|min|aug|dim|sus)?[0-9]?(?:\/[A-G](?:#|b)?)?)\b/g;
        const matches = chordBodyText.match(chordPattern) || [];
        const falsePositives = ["Intro", "Chorus", "Outro", "Verse", "Bridge", "Capo", "Interlude"];
        const validChords = matches.filter(chord => /^[A-G]/.test(chord) && !falsePositives.includes(chord));
        validChords.forEach(chord => {
          if (!chords_used.includes(chord)) {
            chords_used.push(chord);
          }
        });
      }
      const related_songs = [];
      $(".widget_srp_widget .widget_links li a, .widget_links li a").each((i, el) => {
        const title = $(el).text()?.trim();
        const url = $(el).attr("href");
        if (title && url) {
          related_songs.push({
            title: title,
            url: url
          });
        }
      });
      if (related_songs.length === 0) {
        $(".related li a, .yarpp-related li a, .related-posts a").each((i, el) => {
          const title = $(el).text()?.trim();
          const url = $(el).attr("href");
          if (title && url) {
            related_songs.push({
              title: title,
              url: url
            });
          }
        });
      }
      const content_area = $(".entry-content").clone();
      const junk_selectors = ["script", "style", "iframe", "noscript", ".iklan-1", ".iklan-2", ".iklan-3", 'div[id^="cf_async"]', "tonefuse-ad", ".related", ".yarpp-related", ".related-posts", ".share-container", ".social-share", ".judul-chord-diagram", ".tampil-chord-diagram", "#tools-dropdown", "#color-dropdown", 'div[id^="ats-insert_ads"]', ".advertisement", ".banner", '[class*="ad-"]', '[id*="ad-"]'];
      junk_selectors.forEach(sel => content_area.find(sel).remove());
      let chord_body = "";
      const preElement = content_area.find("pre");
      if (preElement.length > 0) {
        chord_body = preElement.text();
      } else {
        chord_body = content_area.text();
      }
      chord_body = chord_body.replace(/\r\n/g, "\n").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
      chord_body = chord_body.replace(/CHORD YANG DIPAKAI[\s\S]*$/i, "").replace(/Lihat Juga[\s\S]*$/i, "").replace(/Chord Dasar[\s\S]*$/i, "").trim();
      console.log(`[LOG] ✅ Detail extraction complete`);
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
  const api = new ChordIndonesia();
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