import axios from "axios";
import * as cheerio from "cheerio";
class FDroid {
  constructor() {
    this.base_url = "https://f-droid.org";
    this.search_url = "https://search.f-droid.org";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    const colors = {
      info: "[36m",
      error: "[31m",
      success: "[32m",
      process: "[33m",
      reset: "[0m"
    };
    const color = colors[type] || colors.info;
    console.log(`${color}[${time}] [${type.toUpperCase()}] ${msg}${colors.reset}`);
  }
  async search({
    query,
    limit = 10,
    page = 1,
    detail = false,
    lang = "id",
    ...rest
  }) {
    const results = [];
    const max_pages = Math.ceil(limit / 10) + 3;
    const params = new URLSearchParams({
      q: query,
      lang: lang,
      ...rest
    });
    this.log(`Search: "${query}" | Start: ${page} | Limit: ${limit}`, "process");
    try {
      for (let i = 0; i < max_pages; i++) {
        if (results.length >= limit) break;
        const curr_page = page + i;
        params.set("page", curr_page.toString());
        const fetch_url = `${this.search_url}/?${params.toString()}`;
        this.log(`Fetching page ${curr_page}...`, "info");
        const {
          data
        } = await axios.get(fetch_url, {
          headers: this.headers
        });
        const $ = cheerio.load(data);
        const items = $(".package-header").toArray();
        if (!items.length) {
          this.log("No more items found.", "info");
          break;
        }
        for (const el of items) {
          if (results.length >= limit) break;
          const node = $(el);
          const href = node.attr("href") || "";
          const full_url = href.startsWith("http") ? href : `${this.base_url}${href}`;
          const pkg_id = href.split("/").pop() || null;
          const basic = {
            package_name: node.find(".package-name").text().trim() || null,
            package_id: pkg_id,
            icon: node.find(".package-icon").attr("src") || null,
            summary: node.find(".package-summary").text().trim() || null,
            license: node.find(".package-license").text().trim() || null,
            url: full_url
          };
          const final_item = detail ? {
            ...basic,
            ...await this.detail({
              url: full_url
            })
          } : basic;
          results.push(final_item);
        }
        const has_next = $(".pagination .step-links a").last().attr("href");
        if (!has_next) break;
      }
      this.log(`Collected ${results.length} items`, "success");
      return results;
    } catch (e) {
      this.log(`Search failed: ${e.message}`, "error");
      return [];
    }
  }
  async detail({
    url
  }) {
    try {
      const target = url.startsWith("http") ? url : `${this.base_url}/id/packages/${url.replace(/^packages\//, "")}`;
      const {
        data
      } = await axios.get(target, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const title = $(".package-name").text().trim() || null;
      const icon = $(".package-icon").attr("src") || null;
      const summary = $(".package-summary").text().trim() || null;
      const description = $(".package-description").html()?.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim() || null;
      const wn_el = $(".package-whats-new");
      const whats_new = wn_el.length ? {
        title: wn_el.find(".new-in-version").text().trim() || null,
        content: wn_el.find('div[dir="auto"]').html()?.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim() || null
      } : null;
      const links = {
        author: {
          name: "Unknown",
          url: null,
          mail: null
        },
        license: {
          name: "Unknown",
          url: null
        },
        source: null,
        issues: null,
        changelog: null,
        website: null,
        build_metadata: null,
        reproducibility: null
      };
      const link_els = $("#links .package-link").toArray();
      for (const el of link_els) {
        const node = $(el);
        const id = node.attr("id");
        const anchor = node.find("a");
        const href = anchor.attr("href");
        const raw_text = node.text().replace(/(Pembuat:|Lisensi:)/, "").trim();
        if (id === "author_name" || id === "author") {
          links.author.name = anchor.length ? anchor.text().trim() : raw_text;
          if (href?.startsWith("mailto:")) {
            links.author.mail = href.replace("mailto:", "").split("?")[0];
          } else {
            links.author.url = href || null;
          }
        } else if (id === "license") {
          links.license.name = anchor.length ? anchor.text().trim() : raw_text;
          links.license.url = href || null;
        } else if (href) {
          if (id === "source_code") links.source = href;
          else if (id === "issue_tracker") links.issues = href;
          else if (id === "changelog") links.changelog = href;
          else if (id === "website") links.website = href;
          else if (id === "build_metadata") links.build_metadata = href;
          else if (id === "reproducibility_status") links.reproducibility = href;
        }
      }
      const donations = $(".donate-options .package-link a").map((_, el) => ({
        platform: $(el).text().trim() || null,
        url: $(el).attr("href") || null
      })).get();
      const screenshots = $(".js_slide.screenshot img").map((_, el) => $(el).attr("src")).get();
      const version_els = $(".package-version").toArray();
      const versions = [];
      for (const el of version_els) {
        const v = $(el);
        const h_txt = v.find(".package-version-header").text();
        const v_code = h_txt.match(/\((\d+)\)/)?.[1];
        const v_name = v.find(".package-version-header b").text().replace(/Versi/i, "").trim();
        const added = h_txt.split("Ditambahkan pada")[1]?.trim();
        const dl_wrap = v.find(".package-version-download");
        const src_txt = v.find(".package-version-source").text();
        const perms = v.find(".package-version-permissions-list .permission").map((__, p) => {
          const $p = $(p);
          const extra = $p.clone().children().remove().end().text().replace(/[()\n\t]/g, "").trim();
          return {
            label: $p.find(".permission-label").text().trim() || null,
            description: $p.find(".permission-description").text().trim() || null,
            extra: extra || null
          };
        }).get();
        versions.push({
          version_name: v_name || null,
          version_code: v_code ? parseInt(v_code) : null,
          is_suggested: v.find(".suggested-badge").length > 0,
          added_on: added || null,
          requirements: v.find(".package-version-requirement").text().replace("Versi ini mengharuskan", "").trim() || null,
          native_code: v.find(".package-version-nativecode").text().trim() || null,
          signed_by_developer: src_txt.toLowerCase().includes("ditanda tangani oleh pengembang aslinya"),
          downloads: {
            apk: dl_wrap.find('a[href$=".apk"]').attr("href") || null,
            pgp: dl_wrap.find('a[href$=".asc"]').attr("href") || null,
            build_log: dl_wrap.find('a[href$=".log.gz"]').attr("href") || null,
            source_tarball: v.find('.package-version-source a[href$=".tar.gz"]').attr("href") || null,
            size: dl_wrap.text().match(/(\d+(\.\d+)?\s?(MiB|KiB|GiB|B))/)?.[1] || null
          },
          permissions: perms.length ? perms : null
        });
      }
      return {
        title: title,
        icon: icon,
        summary: summary,
        description: description,
        whats_new: whats_new,
        license: links.license,
        author: links.author,
        links: {
          source: links.source,
          issues: links.issues,
          changelog: links.changelog,
          website: links.website,
          build_metadata: links.build_metadata,
          reproducibility: links.reproducibility
        },
        donations: donations.length ? donations : null,
        screenshots: screenshots.length ? screenshots : null,
        versions: versions.length ? versions : null,
        last_updated: versions[0]?.added_on || null
      };
    } catch (e) {
      this.log(`Detail error: ${e.message}`, "error");
      return {};
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
      error: "Parameter 'action' wajib diisi",
      actions: ["search", "detail"]
    });
  }
  const api = new FDroid();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'"
          });
        }
        result = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'detail'"
          });
        }
        result = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["search", "detail"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}