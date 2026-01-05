import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class WikiClient {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://id.wikipedia.org",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID",
        "Sec-Fetch-Mode": "cors"
      }
    }));
  }
  async req(url, params = {}) {
    try {
      const {
        data
      } = await this.client.get(url, {
        params: params
      });
      return data;
    } catch (e) {
      console.error(`[ERR] Fetch ${url}: ${e.message}`);
      return null;
    }
  }
  cleanText($, element) {
    if (!element || $(element).length === 0) return null;
    try {
      const el = $(element).clone();
      el.find("sup, style, script, .mw-editsection, .reference, .noprint, .error, .hatnote, .Template-Fact").remove();
      el.find("br").replaceWith(", ");
      el.find("li").prepend("• ");
      el.find("li").append("\n");
      let text = el.text();
      text = text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, " ").replace(/ ,/g, ",").replace(/^,|,$/g, "").trim();
      return text || null;
    } catch (e) {
      return null;
    }
  }
  extractImages($) {
    try {
      const images = [];
      $(".infobox img, .thumbimage, .gallery img, .mw-parser-output > div > a > img").each((i, el) => {
        let src = $(el).attr("src");
        const alt = $(el).attr("alt") || "";
        if (src) {
          if (src.includes("/thumb/")) src = src.replace("/thumb/", "/").split("/").slice(0, -1).join("/");
          if (src.startsWith("//")) src = "https:" + src;
          if (!src.endsWith(".svg") && !src.includes("Flag_of") && !src.includes("Ambox")) {
            images.push({
              url: src,
              caption: alt
            });
          }
        }
      });
      return [...new Map(images.map(item => [item.url, item])).values()];
    } catch (e) {
      return [];
    }
  }
  parseComponents($) {
    const infobox = {};
    const taxonomy = {};
    let isTaxonomyMode = false;
    try {
      $(".infobox tr").each((i, row) => {
        const $row = $(row);
        if ($row.find("th[colspan]").length > 0) {
          const header = this.cleanText($, $row.find("th"));
          if (header) {
            if (header.toLowerCase().includes("klasifikasi") || header.toLowerCase().includes("scientific")) {
              isTaxonomyMode = true;
            } else {
              isTaxonomyMode = false;
            }
          }
          return;
        }
        let key = null,
          value = null;
        if ($row.find("th").length > 0 && $row.find("td").length > 0) {
          key = this.cleanText($, $row.find("th").first());
          value = this.cleanText($, $row.find("td").first());
        } else if ($row.find("td").length > 1) {
          key = this.cleanText($, $row.find("td").eq(0));
          value = this.cleanText($, $row.find("td").eq(1));
        }
        if (key && value && key.length > 1 && value.length > 0) {
          key = key.replace(/:$/, "").trim();
          if (isTaxonomyMode) {
            taxonomy[key] = value;
          } else {
            if (key.toLowerCase() !== value.toLowerCase()) {
              infobox[key] = value;
            }
          }
        }
      });
    } catch (e) {
      console.error(`[WARN] Parse components: ${e.message}`);
    }
    return {
      infobox: Object.keys(infobox).length ? infobox : null,
      taxonomy: Object.keys(taxonomy).length ? taxonomy : null
    };
  }
  parseSections($) {
    const sections = [];
    const ignoreList = ["Daftar isi", "Referensi", "Pranala luar", "Lihat pula", "Catatan kaki", "Sumber", "Bacaan lanjut"];
    try {
      const $containers = $("section[data-mw-section-id]");
      if ($containers.length > 0) {
        $containers.each((i, el) => {
          const $sec = $(el);
          const heading = $sec.find("h2, h3, .mw-heading").first().text().trim();
          if (!heading || ignoreList.some(x => heading.includes(x))) return;
          const paragraphs = [];
          $sec.find("p, ul, ol").each((j, node) => {
            if ($(node).parents(".infobox, .navbox, .hatnote, table").length === 0) {
              const txt = this.cleanText($, node);
              if (txt && txt.length > 5) paragraphs.push(txt);
            }
          });
          if (paragraphs.length > 0) {
            sections.push({
              heading: heading,
              content: paragraphs.join("\n\n")
            });
          }
        });
      }
      if (sections.length === 0) {
        $(".mw-parser-output > h2, .mw-parser-output > h3").each((i, el) => {
          const heading = $(el).text().trim();
          if (!heading || ignoreList.some(x => heading.includes(x))) return;
          const paragraphs = [];
          let $next = $(el).next();
          while ($next.length && !$next.is("h2, h3, .mw-heading")) {
            if ($next.is("p, ul, ol") && !$next.hasClass("mw-empty-elt")) {
              const txt = this.cleanText($, $next);
              if (txt && txt.length > 5) paragraphs.push(txt);
            }
            $next = $next.next();
          }
          if (paragraphs.length > 0) {
            sections.push({
              heading: heading,
              content: paragraphs.join("\n\n")
            });
          }
        });
      }
    } catch (e) {
      console.error(`[WARN] Section parse: ${e.message}`);
    }
    return sections;
  }
  async getRelated(title, limit = 5) {
    try {
      const data = await this.req("/w/api.php", {
        action: "query",
        format: "json",
        generator: "search",
        gsrsearch: `morelike:${title}`,
        gsrlimit: limit,
        prop: "pageimages|description",
        piprop: "thumbnail",
        pithumbsize: 200
      });
      return Object.values(data?.query?.pages || {}).map(p => ({
        title: p.title,
        description: p.description || null,
        thumbnail: p.thumbnail?.source || null,
        url: `https://id.wikipedia.org/wiki/${encodeURIComponent(p.title)}`
      }));
    } catch (e) {
      return [];
    }
  }
  async page(title) {
    const result = {
      title: title,
      url: `https://id.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      intro: null,
      infobox: null,
      taxonomy: null,
      sections: [],
      images: [],
      stats: {
        references: 0
      }
    };
    try {
      const html = await this.req(`/wiki/${encodeURIComponent(title)}`);
      if (!html) return result;
      const $ = cheerio.load(html);
      const components = this.parseComponents($);
      const sections = this.parseSections($);
      const images = this.extractImages($);
      let intro = null;
      $(".mw-parser-output > p").each((i, el) => {
        const t = this.cleanText($, el);
        if (t && t.length > 50 && !intro) intro = t;
      });
      const refCount = $(".reference").length;
      return {
        ...result,
        title: $("h1#firstHeading").text().trim(),
        intro: intro,
        infobox: components.infobox,
        taxonomy: components.taxonomy,
        sections: sections,
        images: images,
        stats: {
          references: refCount
        }
      };
    } catch (e) {
      console.error(`[ERR] Page ${title}: ${e.message}`);
      return {
        ...result,
        error: e.message
      };
    }
  }
  async search({
    query,
    limit = 5,
    detail = false,
    related = false
  }) {
    console.log(`[LOG] Search: "${query}" | Detail: ${detail} | Related: ${related}`);
    const results = [];
    try {
      const apiData = await this.req("/w/api.php", {
        action: "query",
        format: "json",
        generator: "prefixsearch",
        gpssearch: query,
        gpslimit: limit,
        prop: "pageimages|description|info",
        piprop: "thumbnail",
        pithumbsize: 200,
        inprop: "url"
      });
      const pages = Object.values(apiData?.query?.pages || {});
      for (const item of pages) {
        let entry = {
          page_id: item.pageid,
          title: item.title,
          description: item.description || null,
          thumbnail: item.thumbnail?.source || null,
          url: item.fullurl
        };
        if (detail) {
          try {
            const fullData = await this.page(item.title);
            entry = {
              ...entry,
              ...fullData
            };
          } catch (e) {}
        }
        if (related) {
          try {
            const relatedItems = await this.getRelated(item.title, 3);
            entry = {
              ...entry,
              related_articles: relatedItems
            };
          } catch (e) {
            entry.related_articles = [];
          }
        }
        results.push(entry);
      }
    } catch (e) {
      console.error(`[ERR] Search Global: ${e.message}`);
    }
    return results;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new WikiClient();
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