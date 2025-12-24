import axios from "axios";
import * as cheerio from "cheerio";
class BraveSearch {
  constructor() {
    this.cfg = {
      url: "https://search.brave.com/search",
      hdr: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "id-ID",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        referer: "https://search.brave.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        priority: "u=0, i"
      }
    };
  }
  async search({
    query,
    ...rest
  }) {
    const q = query ?? rest.q ?? "";
    console.log("🔍 Search:", q);
    try {
      const p = {
        q: q,
        source: "web",
        ...rest
      };
      const r = await axios.get(this.cfg.url, {
        params: p,
        headers: this.cfg.hdr
      });
      console.log("✅ Status:", r.status);
      return this.parse(r.data);
    } catch (e) {
      console.error("❌ Error:", e?.message ?? e);
      return {
        error: e?.message ?? "unknown",
        results: []
      };
    }
  }
  parse(html) {
    console.log("📄 Parsing HTML...");
    const $ = cheerio.load(html);
    const results = $('.snippet[data-type="web"]').map((i, el) => {
      const $el = $(el);
      const pos = $el.attr("data-pos") || null;
      const $link = $el.find("a.l1").first();
      const url = $link.attr("href") || "";
      const title = $link.find(".title").text().trim() || "No title";
      const $siteWrapper = $el.find(".site-wrapper");
      const sitename = $siteWrapper.find(".sitename").text().trim() || "";
      const $cite = $siteWrapper.find("cite.snippet-url");
      const netloc = $cite.find(".netloc").text().trim() || "";
      const urlPath = $cite.find(".url-path").text().trim() || "";
      const desc = $el.find(".snippet-description").text().trim() || "No description";
      const $thumb = $el.find(".thumbnail img");
      const thumbnail = $thumb.length ? $thumb.attr("src") : null;
      const meta = {};
      $el.find(".item-attributes .r-attr").each((_, attr) => {
        const $attr = $(attr);
        const text = $attr.text().trim();
        if (text.includes("Dibintangi") || text.includes("Starred")) {
          meta.stars = text.match(/\d+/)?.[0] || null;
        }
        if (text.includes("Diambil") || text.includes("Forked")) {
          meta.forks = text.match(/\d+/)?.[0] || null;
        }
        if (text.includes("Bahasa") || text.includes("Language")) {
          meta.language = text.split(":")[1]?.trim() || null;
        }
        if (text.includes("Penulis") || text.includes("Author")) {
          meta.author = text.split(":")[1]?.trim() || null;
        }
      });
      const dateMatch = desc.match(/\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i);
      const date = dateMatch ? dateMatch[0] : null;
      return {
        position: pos,
        url: url,
        title: title,
        description: desc,
        site: sitename,
        domain: netloc,
        path: urlPath,
        fullPath: urlPath ? `${netloc}${urlPath.startsWith("›") ? urlPath.substring(1).trim() : urlPath}` : netloc,
        thumbnail: thumbnail,
        date: date,
        metadata: Object.keys(meta).length > 0 ? meta : null
      };
    }).get().filter(r => r.url);
    console.log(`✨ Found ${results.length} results`);
    return {
      count: results.length,
      results: results
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new BraveSearch();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}