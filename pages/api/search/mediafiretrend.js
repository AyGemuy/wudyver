import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class MediaFireScraper {
  constructor() {
    this.proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/proxy/v1?host=23&url=`;
    this.base = "https://mediafiretrend.com";
  }
  async get(url) {
    console.log("📡 Fetch:", url.slice(-40));
    try {
      const {
        data
      } = await axios.get(`${this.proxy}${encodeURIComponent(url)}`, {
        validateStatus: status => status >= 200 && status < 500
      });
      return cheerio.load(data);
    } catch (e) {
      throw new Error(`Fetch failed: ${e.message}`);
    }
  }
  async search({
    query,
    limit = 5,
    detail = true,
    ...rest
  }) {
    console.log(`🔍 Search: "${query}" (limit: ${limit})`);
    try {
      const $ = await this.get(`${this.base}/?q=${encodeURIComponent(query)}&search=Search`);
      const results = [];
      for (const row of $("table tr").get()) {
        if (results.length >= limit) break;
        const $row = $(row);
        const $td = $row.find('td.item a[href*="/f/"]').eq(0);
        const href = $td.attr("href") || "";
        const id = href.match(/\/f\/(\d+)/)?.[1] || "";
        if (!id) continue;
        const title = $td.text().trim() || "Unknown";
        const size = $td.parent().text().match(/\((\d+(?:\.\d+)?\s*[KM]B?)\)/)?.[1] || "Unknown";
        const source = $row.find("span").eq(0).text().trim() || "";
        console.log(`✅ Found: ${title}`);
        let result = {
          id: id,
          title: title,
          size: size,
          url: `${this.base}${href}`,
          source: source
        };
        if (detail) {
          console.log(`🔗 Detail: ${title}`);
          const det = await this.detail({
            url: result.url,
            ...rest
          });
          if (det?.error) {
            console.log(`⚠️ Skip: ${title} (detail error)`);
            continue;
          }
          result = {
            ...result,
            ...det
          };
        }
        results.push(result);
      }
      console.log(`✅ Done: ${results.length} results`);
      return {
        success: true,
        results: results,
        total: results.length
      };
    } catch (e) {
      console.error("❌ Search fail:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    console.log(`🔍 Detail: ${url}`);
    try {
      const $ = await this.get(url);
      const filename = $("td h1").eq(0).text().trim() || "Unknown";
      const fullFn = $("td b").filter((i, el) => $(el).text().includes(".")).eq(0).text().trim() || "Unknown";
      const size = $("td").filter((i, el) => $(el).text().match(/[KM]B/)).eq(0).text().trim() || "Unknown";
      const srcRow = $("td").filter((i, el) => $(el).text().trim() === "Link source:").eq(0);
      const source = srcRow?.next("td")?.text().trim() || "";
      const titleRow = $("td").filter((i, el) => $(el).text().trim() === "Source title:").eq(0);
      const sourceTitle = titleRow?.next("td")?.text().trim() || "";
      let dlUrl = "";
      for (const el of $("script").get()) {
        const code = $(el).html() || "";
        const match = code.match(/unescape\('([^']+)'\)/);
        if (match) {
          const raw = decodeURIComponent(match[1]);
          dlUrl = raw.match(/href=['"]([^'"]+)['"]/i)?.[1] || raw;
          console.log("🔗 Decode:", dlUrl.slice(0, 50));
          break;
        }
      }
      let realUrl = dlUrl || "Unknown";
      if (dlUrl) {
        console.log("🔄 Redirect...");
        try {
          const {
            request
          } = await axios.head(dlUrl);
          realUrl = request?.res?.responseUrl || dlUrl;
        } catch (e) {
          console.warn("⚠️ Redirect fail:", e.message);
          realUrl = dlUrl;
        }
      }
      const similar = [];
      for (const el of $('strong a[href*="/f/"]').get()) {
        const $el = $(el);
        const link = $el.attr("href") || "";
        const text = $el.text().trim();
        if (link && text) similar.push({
          title: text,
          url: `${this.base}${link}`
        });
        if (similar.length >= 5) break;
      }
      console.log(`✅ Detail: ${filename}`);
      return {
        filename: filename,
        full_filename: fullFn,
        file_size: size,
        source_url: source,
        source_title: sourceTitle,
        download_url: realUrl,
        similar: similar
      };
    } catch (e) {
      console.error("❌ Detail fail:", e.message);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const api = new MediaFireScraper();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}