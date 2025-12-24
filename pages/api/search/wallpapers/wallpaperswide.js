import axios from "axios";
import * as cheerio from "cheerio";
class WallpapersWide {
  constructor() {
    this.base = "https://wallpaperswide.com";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    };
  }
  parseUrl(url) {
    try {
      let normalized = url;
      if (!url.startsWith("http")) {
        normalized = `${this.base}${url.startsWith("/") ? url : `/${url}`}`;
      }
      const u = new URL(normalized);
      return {
        full: u.href,
        path: u.pathname,
        params: Object.fromEntries(u.searchParams),
        id: u.pathname.split("/").filter(Boolean).pop()?.replace("-wallpapers.html", "") || ""
      };
    } catch (e) {
      console.error("❌ Parse URL error:", e.message);
      return {
        full: url,
        path: "",
        params: {},
        id: ""
      };
    }
  }
  async _getAllResolutions(detailUrl) {
    try {
      const {
        data
      } = await axios.get(detailUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const resolutions = [];
      $(".wallpaper-resolutions").each((i, section) => {
        const $section = $(section);
        const category = $section.find("h3").text()?.trim() || "Unknown";
        $section.find("a[target='_self']").each((j, el) => {
          const resolution = $(el).text()?.trim();
          const href = $(el).attr("href");
          const title = $(el).attr("title");
          if (resolution && href) {
            const fullUrl = href.startsWith("http") ? href : `${this.base}${href}`;
            resolutions.push({
              resolution: resolution,
              url: fullUrl,
              category: category,
              title: title
            });
          }
        });
      });
      return resolutions;
    } catch (e) {
      console.error("⚠️ Failed to fetch resolution list:", e.message);
      return [];
    }
  }
  async search({
    url,
    query,
    limit = 10,
    detail = true,
    download = true,
    ...rest
  }) {
    try {
      const endpoint = url || `${this.base}/search.html`;
      const params = url ? this.parseUrl(url).params : {
        q: query,
        ...rest
      };
      const {
        data
      } = await axios.get(endpoint, {
        params: params,
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const items = [];
      $("ul.wallpapers li.wall").each((i, el) => {
        if (i >= limit) return false;
        const $el = $(el);
        const link = $el.find('.mini-hud a[href*="-wallpapers.html"]').attr("href");
        const img = $el.find("img.thumb_img").attr("src");
        const title = $el.find(".mini-hud h1").text()?.trim();
        const downloads = $el.find("#hudvisits em").text()?.trim();
        const rating = $el.find(".current-rating").text()?.trim();
        const tags = [];
        $el.find(".mini-tags-text").each((j, tagEl) => {
          tags.push($(tagEl).text()?.trim());
        });
        const fullUrl = link ? link.startsWith("http") ? link : `${this.base}${link}` : null;
        items.push({
          title: title,
          downloads: downloads,
          rating: rating,
          tags: tags,
          thumbnail: img,
          url: fullUrl
        });
      });
      if (detail) {
        for (let item of items) {
          if (item.url) {
            item.detail = await this.detail({
              url: item.url
            });
            if (download && item.detail && item.detail.resolutions) {
              item.downloads = await this.download({
                url: item.url
              });
            }
          }
        }
      }
      return items;
    } catch (e) {
      console.error("❌ Search error:", e.message);
      throw e;
    }
  }
  async detail({
    url
  }) {
    try {
      const {
        full,
        id
      } = this.parseUrl(url);
      const {
        data
      } = await axios.get(full, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const title = $(".breadCrumbs a").last().text()?.trim() || $("h1").text()?.trim() || null;
      const preview = $("#previewThumb").attr("src") || $(".picture_wrapper_details img").attr("src") || null;
      const favorites = $(".wall_fav_count").text()?.trim() || "0";
      const resolutions = await this._getAllResolutions(full);
      return {
        title: title,
        preview: preview,
        favorites: favorites,
        available_resolutions: resolutions.map(r => r.resolution),
        resolutions: resolutions,
        total_resolutions: resolutions.length,
        url: full
      };
    } catch (e) {
      console.error("❌ Detail error:", e.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      const resolutions = await this._getAllResolutions(url);
      if (!resolutions.length) {
        return {
          message: "No resolutions found",
          resolutions: []
        };
      }
      const allResolutions = resolutions.map(res => ({
        resolution: res.resolution,
        category: res.category,
        title: res.title,
        download_url: res.url,
        direct_link: res.url
      }));
      return {
        total_resolutions: allResolutions.length,
        resolutions: allResolutions
      };
    } catch (e) {
      console.error("❌ Download error:", e.message);
      return {
        error: e.message,
        resolutions: []
      };
    }
  }
  async getAllDirectDownloads(url) {
    try {
      const resolutions = await this._getAllResolutions(url);
      if (resolutions.length > 0) {
        return {
          total_resolutions: resolutions.length,
          available_resolutions: resolutions.map(r => ({
            resolution: r.resolution,
            category: r.category,
            title: r.title,
            direct_url: r.url
          }))
        };
      }
      return {
        total_resolutions: 0,
        available_resolutions: []
      };
    } catch (e) {
      console.error("❌ Direct download error:", e.message);
      return {
        error: e.message,
        total_resolutions: 0,
        available_resolutions: []
      };
    }
  }
  async getResolutionsByCategory(url, categoryFilter = null) {
    try {
      const resolutions = await this._getAllResolutions(url);
      if (categoryFilter) {
        const filtered = resolutions.filter(res => res.category.toLowerCase().includes(categoryFilter.toLowerCase()));
        return {
          category: categoryFilter,
          total_resolutions: filtered.length,
          resolutions: filtered.map(res => ({
            resolution: res.resolution,
            category: res.category,
            title: res.title,
            direct_url: res.url
          }))
        };
      }
      const grouped = {};
      resolutions.forEach(res => {
        if (!grouped[res.category]) {
          grouped[res.category] = [];
        }
        grouped[res.category].push({
          resolution: res.resolution,
          title: res.title,
          direct_url: res.url
        });
      });
      return {
        total_resolutions: resolutions.length,
        grouped_by_category: grouped
      };
    } catch (e) {
      console.error("❌ Category filter error:", e.message);
      return {
        error: e.message,
        total_resolutions: 0,
        resolutions: []
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const scraper = new WallpapersWide();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query && !params.url) {
          return res.status(400).json({
            error: "Parameter 'query' atau 'url' wajib diisi untuk action 'search'."
          });
        }
        const searchParams = {
          limit: 5,
          detail: true,
          download: true,
          ...params
        };
        response = await scraper.search(searchParams);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await scraper.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'download'."
          });
        }
        response = await scraper.download(params);
        break;
      case "direct":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'direct'."
          });
        }
        response = await scraper.getAllDirectDownloads(params.url);
        break;
      case "by-category":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'by-category'."
          });
        }
        response = await scraper.getResolutionsByCategory(params.url, params.category);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'detail', 'download', 'direct', 'by-category'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}