import axios from "axios";
import * as cheerio from "cheerio";
class SmuleDownloader {
  constructor() {
    this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36";
    this.key = this._decode("TT18WlV5TXVeLXFXYn1WTF5qSmR9TXYpOHklYlFXWGY+SUZCRGNKPiU0emcyQ2l8dGVsamBkVlpA");
    console.log("[LOG] SmuleScraper ready");
  }
  _decode(e) {
    const o = {},
      l = String.fromCharCode,
      s = e.length;
    let a = 0,
      i = 0,
      c = "";
    let r;
    for (let n = 0; n < 64; n++) o["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(n)] = n;
    for (let t = 0; t < s; t++)
      for (a = (a << 6) + o[e.charAt(t)], i += 6; i >= 8;)(r = a >>> (i -= 8) & 255) || t < s - 2 ? c += l(r) : null;
    return c;
  }
  _decrypt(e) {
    if (!e?.startsWith?.("e:")) return e || null;
    let d;
    try {
      d = this._decode(e.slice(2));
    } catch (err) {
      console.error("[ERR] Base64 fail:", err.message);
      return null;
    }
    const k = this.key,
      sbox = [];
    let a = 0,
      i = "",
      c = 0,
      n, s = 0;
    for (c = 0; c < 256; c++) sbox[c] = c;
    for (let l = 0; l < 256; l++) a = (a + sbox[l] + k.charCodeAt(l % k.length)) % 256,
      n = sbox[l], sbox[l] = sbox[a], sbox[a] = n;
    a = 0;
    for (let p = 0; p < d.length; p++) a = (a + sbox[s = (s + 1) % 256]) % 256, n = sbox[s],
      sbox[s] = sbox[a], sbox[a] = n, i += String.fromCharCode(d.charCodeAt(p) ^ sbox[(sbox[s] + sbox[a]) % 256]);
    return i.startsWith("http") ? i : (console.error("[ERR] Decrypt not HTTP"), null);
  }
  _extractPerformanceObject(script) {
    const dataStoreMatch = script.match(/window\.DataStore\s*=\s*({[^;]+});/);
    if (dataStoreMatch) {
      try {
        const dataStoreStr = dataStoreMatch[1].replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3').replace(/'/g, '"');
        const dataStore = JSON.parse(dataStoreStr);
        if (dataStore.Pages?.Recording?.performance) {
          console.log("[LOG] Found performance via DataStore");
          return dataStore.Pages.Recording.performance;
        }
      } catch (e) {
        console.warn("[WARN] DataStore parse failed, trying alternative method");
      }
    }
    const perfRegex = /"Recording":\s*{([^}]*"performance":\s*{([^}]*|{[^{}]*})*})/g;
    let match;
    while ((match = perfRegex.exec(script)) !== null) {
      try {
        const perfStart = script.indexOf('"performance":', match.index);
        if (perfStart === -1) continue;
        let braceCount = 0;
        let inString = false;
        let escape = false;
        let i = perfStart + '"performance":'.length;
        while (i < script.length && /\s/.test(script[i])) i++;
        if (script[i] !== "{") continue;
        braceCount = 1;
        i++;
        const startIdx = i;
        for (; i < script.length && braceCount > 0; i++) {
          const char = script[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === "\\") {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "{") braceCount++;
            if (char === "}") braceCount--;
          }
        }
        if (braceCount === 0) {
          const perfStr = script.substring(startIdx - 1, i);
          const jsonStr = perfStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3').replace(/'/g, '"').replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
          const performance = JSON.parse(jsonStr);
          console.log("[LOG] Found performance via direct extraction");
          return performance;
        }
      } catch (e) {
        console.warn("[WARN] Performance extraction failed:", e.message);
        continue;
      }
    }
    const fallbackMatch = script.match(/"performance":\s*({[^}]*"media_url"[^}]*})/);
    if (fallbackMatch) {
      try {
        const jsonStr = fallbackMatch[1].replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3').replace(/'/g, '"');
        const performance = JSON.parse(jsonStr);
        console.log("[LOG] Found performance via fallback");
        return performance;
      } catch (e) {
        console.warn("[WARN] Fallback extraction failed");
      }
    }
    return null;
  }
  async get(url) {
    console.log(`[LOG] Scraping: ${url}`);
    try {
      const {
        data: html
      } = await axios.get(url, {
        headers: {
          "User-Agent": this.ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br"
        },
        timeout: 1e4
      });
      const $ = cheerio.load(html);
      const scripts = $("script").toArray();
      let performance = null;
      for (const scriptElem of scripts) {
        const scriptContent = $(scriptElem).html();
        if (!scriptContent || !scriptContent.includes("performance")) continue;
        performance = this._extractPerformanceObject(scriptContent);
        if (performance) break;
      }
      if (!performance) {
        return {
          success: false,
          error: "Performance data not found in page",
          debug: "Tried all extraction methods"
        };
      }
      const audioUrl = this._decrypt(performance.media_url);
      const videoUrl = this._decrypt(performance.video_media_url);
      const result = {
        success: true,
        id: performance.key || performance.performance_key || null,
        title: performance.title || $('meta[property="og:title"]').attr("content")?.replace(" | Smule", "") || $("title").text().trim(),
        artist: performance.artist || null,
        message: performance.message || null,
        type: performance.type === "audio" ? "Audio" : performance.type === "video" ? "Video" : "Unknown",
        duration: performance.song_length || null,
        urls: {
          original: url,
          cover: performance.cover_url || $('meta[property="og:image"]').attr("content") || null,
          audio: audioUrl,
          video: videoUrl,
          embed: performance.web_url ? `https://www.smule.com${performance.web_url}/frame/box` : null
        },
        stats: {
          listens: performance.stats?.total_listens || 0,
          loves: performance.stats?.total_loves || 0,
          comments: performance.stats?.total_comments || 0,
          gifts: performance.stats?.total_gifts || 0,
          collaborators: performance.child_count || 0
        },
        owner: {
          handle: performance.owner?.handle || null,
          profile: performance.owner?.url ? `https://www.smule.com${performance.owner.url}` : null,
          avatar: performance.owner?.pic_url || null,
          vip: performance.owner?.is_vip ?? false,
          verified: performance.owner?.is_verified ?? false
        },
        dates: {
          created: performance.created_at || null,
          expired: performance.expire_at || null
        },
        segments: performance.segments || []
      };
      console.log("[LOG] Scraping successful");
      return result;
    } catch (error) {
      console.error("[ERR] Scrape failed:", error.message);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }
  async download({
    url,
    ...opt
  }) {
    console.log(`[LOG] Download: ${url}`, opt);
    try {
      const result = await this.get(url);
      return result;
    } catch (error) {
      console.error("[ERR] Download failed:", error.message);
      return {
        success: false,
        message: error.message,
        code: error.code
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    error: "Missing required field: url"
  });
  const downloader = new SmuleDownloader();
  try {
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
}