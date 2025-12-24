import axios from "axios";
import * as cheerio from "cheerio";
class CrxTool {
  constructor() {
    this.rCws = /https?:\/\/(?:chrome|chromewebstore)\.google\.com\/.*\/([a-z]{32})(?=[\/#?]|$)/;
    this.rEdge = /https?:\/\/microsoftedge\.microsoft\.com\/addons\/detail\/.*\/([a-z]{32})(?=[\/#?]|$)/;
    this.rId = /^[a-z]{32}$/;
  }
  log(m, tag = "INFO") {
    console.log(`[${tag}] ${m}`);
  }
  clean(s) {
    return (s || "extension").replace(/[^\w\s\.-]/g, "").trim().replace(/\s+/g, "-");
  }
  find(v) {
    try {
      const id = v.match(this.rEdge)?.[1] || v.match(this.rCws)?.[1] || (this.rId.test(v) ? v : null);
      if (!id) throw new Error("ID/URL Pattern mismatch");
      const src = this.rEdge.test(v) ? "edge" : "google";
      return {
        id: id,
        src: src
      };
    } catch (e) {
      return null;
    }
  }
  make(id, src, c) {
    if (src === "edge") {
      return `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&prod=chromiumcrx&x=id%3D${id}%26installsource%3Dondemand%26uc`;
    }
    return `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=${c.ver}&acceptformat=crx2,crx3&x=id%3D${id}%26uc&nacl_arch=${c.nacl}&os=${c.os}&arch=${c.arch}`;
  }
  parseSrcset(srcset) {
    if (!srcset) return null;
    const sources = srcset.split(",").map(s => s.trim());
    return sources[sources.length - 1].split(" ")[0];
  }
  async scrapeMeta(id) {
    const targetUrl = `https://chromewebstore.google.com/detail/${id}`;
    try {
      const {
        data,
        request
      } = await axios.get(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      const $ = cheerio.load(data);
      const name = $("h1.Pa2dE").text().trim();
      const description = $('div[jsname="ij8cu"]').text().trim() || $(".mN52G").text().trim();
      const iconEl = $("img.rBxtY").first();
      let icon = this.parseSrcset(iconEl.attr("srcset")) || iconEl.attr("src");
      if (icon) icon = icon.replace(/=s\d+.*$/, "=s128");
      const version = $(".nBZElf").text().trim();
      const updated = $(".MqICNe").filter((_, el) => $(el).text().includes("Updated") || $(el).text().includes("Diupdate")).children().last().text().trim();
      const size = $(".MqICNe").filter((_, el) => $(el).text().includes("Size") || $(el).text().includes("Ukuran")).children().last().text().trim();
      const rating = $(".Vq0ZA").first().text().trim();
      const ratingCount = $(".xJEoWe").text().replace(/[()]/g, "").trim();
      const screenshots = [];
      $('div[jsname="j8Rbke"]').each((i, el) => {
        const $el = $(el);
        let src = $el.attr("data-media-url");
        if (!src) {
          const $img = $el.find("img");
          const rawSrc = $img.attr("src");
          if (rawSrc && rawSrc.startsWith("http")) {
            src = rawSrc;
          }
        }
        if (src) {
          const cleanSrc = src.replace(/=.*$/, "=s1280");
          screenshots.push(cleanSrc);
        }
      });
      return {
        name: name,
        description: description,
        version: version,
        icon: icon,
        rating: rating,
        ratingCount: ratingCount,
        updated: updated,
        size: size,
        screenshots: screenshots,
        originalUrl: request.res.responseUrl || targetUrl
      };
    } catch (e) {
      this.log(`Scraping failed: ${e.message}`, "WARN");
      return {};
    }
  }
  async download({
    url,
    ext = "crx",
    ver,
    os,
    arch,
    ...rest
  }) {
    this.log(`Start Processing: ${url}`, "PROC");
    try {
      const meta = this.find(url);
      if (!meta) throw new Error("Invalid URL or ID");
      const c = {
        ver: ver || "9999.0.9999.0",
        os: os || "win",
        arch: arch || "x64"
      };
      c.nacl = c.arch.includes("86") && !c.arch.includes("64") ? "x86-32" : "x86-64";
      let details = {};
      if (meta.src === "google") {
        this.log(`Fetching metadata for ${meta.id}...`, "NET");
        details = await this.scrapeMeta(meta.id);
      }
      if (details.version) c.ver = details.version;
      const downloadLink = this.make(meta.id, meta.src, c);
      const fname = this.clean(details.name || meta.id);
      this.log(`Generated: ${fname}`, "DONE");
      return {
        success: true,
        info: {
          id: meta.id,
          source: meta.src,
          name: details.name || meta.id,
          filename: `${fname}.${ext}`,
          description: details.description,
          version: details.version || c.ver,
          icon: details.icon,
          rating: details.rating,
          rating_count: details.ratingCount,
          last_updated: details.updated,
          size: details.size,
          screenshots: details.screenshots,
          store_url: details.originalUrl || url
        },
        config: c,
        download: downloadLink,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      this.log(e.message, "ERR");
      return {
        success: false,
        error: e.message,
        input: url
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new CrxTool();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}