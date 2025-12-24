import axios from "axios";
import * as cheerio from "cheerio";
class HDWallpapersIN {
  constructor() {
    this.base = "https://www.hdwallpapers.in";
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
  _normalizeThumbnailUrl(thumbUrl) {
    if (!thumbUrl) return null;
    try {
      if (thumbUrl.startsWith("http")) {
        return thumbUrl;
      }
      return `${this.base}${thumbUrl.startsWith("/") ? thumbUrl : `/${thumbUrl}`}`;
    } catch (e) {
      console.error("❌ Error normalizing thumbnail URL:", e.message);
      return thumbUrl;
    }
  }
  async _getWallpaperDetail(detailUrl) {
    try {
      const {
        data
      } = await axios.get(detailUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const title = $("h1.title").text()?.trim() || null;
      const categoryInfo = $(".section-wrapper.review .section").text()?.trim() || "";
      const dateMatch = categoryInfo.match(/Added\s+([^in]+)\s+in/);
      const addedDate = dateMatch ? dateMatch[1].trim() : null;
      const categories = [];
      $(".section-wrapper.review .section a").each((i, el) => {
        categories.push($(el).text()?.trim());
      });
      const preview = $(".wallpaper-thumb img").attr("src");
      const normalizedPreview = this._normalizeThumbnailUrl(preview);
      const downloadLinks = [];
      $("a[href*='/download/']").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text()?.trim();
        if (href && href.includes("/download/")) {
          const fullUrl = href.startsWith("http") ? href : `${this.base}${href}`;
          downloadLinks.push({
            resolution: text || "HD",
            url: fullUrl,
            filename: href.split("/").pop()
          });
        }
      });
      const navigation = {
        previous: null,
        next: null
      };
      $(".navigation_thumb a.prev").each((i, el) => {
        const href = $(el).attr("href");
        const thumb = $(el).find("img").attr("src");
        if (href) {
          navigation.previous = {
            url: href.startsWith("http") ? href : `${this.base}${href}`,
            thumbnail: this._normalizeThumbnailUrl(thumb)
          };
        }
      });
      $(".navigation_thumb a.next").each((i, el) => {
        const href = $(el).attr("href");
        const thumb = $(el).find("img").attr("src");
        if (href) {
          navigation.next = {
            url: href.startsWith("http") ? href : `${this.base}${href}`,
            thumbnail: this._normalizeThumbnailUrl(thumb)
          };
        }
      });
      return {
        title: title,
        added_date: addedDate,
        categories: categories,
        preview: normalizedPreview,
        download_links: downloadLinks,
        navigation: navigation,
        url: detailUrl
      };
    } catch (e) {
      console.error("❌ Failed to get wallpaper detail:", e.message);
      return null;
    }
  }
  async search({
    query,
    page = 1,
    limit = 20,
    detail = true,
    download = true
  }) {
    try {
      const endpoint = `${this.base}/search.html`;
      const params = {
        q: query,
        page: page
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
        const link = $el.find('a[href*="-wallpapers.html"]').attr("href");
        const img = $el.find("img.thumb_img").attr("src");
        const alt = $el.find("img.thumb_img").attr("alt");
        const title = $el.find("em1").text()?.trim() || alt;
        const srcset = $el.find("img.thumb_img").attr("srcset");
        const fullUrl = link ? link.startsWith("http") ? link : `${this.base}${link}` : null;
        const normalizedImg = this._normalizeThumbnailUrl(img);
        let thumbnails = {
          standard: normalizedImg
        };
        if (srcset) {
          const srcsetParts = srcset.split(",").map(part => part.trim());
          srcsetParts.forEach(part => {
            const [url, resolution] = part.split(" ");
            if (url && resolution) {
              thumbnails[resolution] = this._normalizeThumbnailUrl(url);
            }
          });
        }
        items.push({
          title: title,
          thumbnail: normalizedImg,
          thumbnails: thumbnails,
          alt: alt,
          url: fullUrl
        });
      });
      if (detail) {
        for (let item of items) {
          if (item.url) {
            item.detail = await this._getWallpaperDetail(item.url);
            if (download && item.detail && item.detail.download_links) {
              item.downloads = item.detail.download_links;
            }
          }
        }
      }
      return {
        query: query,
        page: page,
        total_results: items.length,
        results: items
      };
    } catch (e) {
      console.error("❌ Search error:", e.message);
      throw e;
    }
  }
  async latest({
    page = 1,
    limit = 20,
    detail = true,
    download = true
  }) {
    try {
      const endpoint = page === 1 ? `${this.base}/` : `${this.base}/page/${page}`;
      const {
        data
      } = await axios.get(endpoint, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const items = [];
      $("ul.wallpapers li.wall").each((i, el) => {
        if (i >= limit) return false;
        const $el = $(el);
        const link = $el.find('a[href*="-wallpapers.html"]').attr("href");
        const img = $el.find("img.thumb_img").attr("src");
        const alt = $el.find("img.thumb_img").attr("alt");
        const title = $el.find("em1").text()?.trim() || alt;
        const srcset = $el.find("img.thumb_img").attr("srcset");
        const fullUrl = link ? link.startsWith("http") ? link : `${this.base}${link}` : null;
        const normalizedImg = this._normalizeThumbnailUrl(img);
        let thumbnails = {
          standard: normalizedImg
        };
        if (srcset) {
          const srcsetParts = srcset.split(",").map(part => part.trim());
          srcsetParts.forEach(part => {
            const [url, resolution] = part.split(" ");
            if (url && resolution) {
              thumbnails[resolution] = this._normalizeThumbnailUrl(url);
            }
          });
        }
        items.push({
          title: title,
          thumbnail: normalizedImg,
          thumbnails: thumbnails,
          alt: alt,
          url: fullUrl
        });
      });
      if (detail) {
        for (let item of items) {
          if (item.url) {
            item.detail = await this._getWallpaperDetail(item.url);
            if (download && item.detail && item.detail.download_links) {
              item.downloads = item.detail.download_links;
            }
          }
        }
      }
      return {
        type: "latest",
        page: page,
        total_wallpapers: items.length,
        wallpapers: items
      };
    } catch (e) {
      console.error("❌ Latest wallpapers error:", e.message);
      throw e;
    }
  }
  async detail({
    url
  }) {
    try {
      return await this._getWallpaperDetail(url);
    } catch (e) {
      console.error("❌ Detail error:", e.message);
      return null;
    }
  }
  async download({
    url,
    resolution = null
  }) {
    try {
      const detail = await this._getWallpaperDetail(url);
      if (!detail || !detail.download_links.length) {
        return {
          error: "No download links found",
          downloads: []
        };
      }
      if (resolution) {
        const target = detail.download_links.find(link => link.resolution.toLowerCase().includes(resolution.toLowerCase()));
        if (target) {
          return {
            resolution: target.resolution,
            download_url: target.url,
            filename: target.filename,
            all_resolutions: detail.download_links.map(link => link.resolution)
          };
        } else {
          console.log(`⚠️ Resolution ${resolution} not found, returning all downloads`);
        }
      }
      return {
        total_downloads: detail.download_links.length,
        downloads: detail.download_links
      };
    } catch (e) {
      console.error("❌ Download error:", e.message);
      return {
        error: e.message,
        downloads: []
      };
    }
  }
  async getCategories() {
    try {
      const {
        data
      } = await axios.get(this.base, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const categories = [];
      $("a[href*='-desktop-wallpapers.html']").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text()?.trim();
        if (href && text && !text.includes("Home") && !text.includes("RSS")) {
          const fullUrl = href.startsWith("http") ? href : `${this.base}${href}`;
          categories.push({
            name: text,
            url: fullUrl
          });
        }
      });
      return {
        total_categories: categories.length,
        categories: categories
      };
    } catch (e) {
      console.error("❌ Categories error:", e.message);
      return {
        error: e.message,
        categories: []
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
  const scraper = new HDWallpapersIN();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        const searchParams = {
          limit: 20,
          detail: true,
          download: true,
          ...params
        };
        response = await scraper.search(searchParams);
        break;
      case "latest":
        const latestParams = {
          limit: 20,
          detail: true,
          download: true,
          ...params
        };
        response = await scraper.latest(latestParams);
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
      case "categories":
        response = await scraper.getCategories();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'latest', 'detail', 'download', 'categories'.`
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