import axios from "axios";
import * as cheerio from "cheerio";
class WallpaperFlare {
  constructor() {
    this.base = "https://www.wallpaperflare.com";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
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
        id: u.pathname.split("/").filter(Boolean).pop()
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
  _extractImageId(previewUrl) {
    if (!previewUrl) return null;
    try {
      const urlObj = new URL(previewUrl);
      const pathname = urlObj.pathname;
      const filename = pathname.split("/").pop();
      if (!filename) return null;
      const baseName = filename.replace("-preview.jpg", "").replace(".jpg", "");
      const pathParts = pathname.split("/").filter(part => part && !part.includes("."));
      if (pathParts.length >= 3) {
        return pathParts.slice(-3).join("-");
      }
      return baseName;
    } catch (e) {
      console.error("❌ Error extracting image ID:", e.message);
      return null;
    }
  }
  async _getImageToken(downloadPageUrl) {
    try {
      const {
        data
      } = await axios.get(downloadPageUrl, {
        headers: {
          ...this.headers,
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const $ = cheerio.load(data);
      let imageId = null;
      let previewUrl = null;
      const selectors = ["#dld_thumb", "#resize", "#show_img", "#wallpaper", ".preview-img"];
      for (const selector of selectors) {
        if ($(selector).length) {
          previewUrl = $(selector).attr("src");
          if (previewUrl) break;
        }
      }
      if (!previewUrl) {
        const scriptContent = $("script").text();
        const urlMatch = scriptContent.match(/(https:\/\/[^\s"']*?\.jpg)/);
        if (urlMatch) {
          previewUrl = urlMatch[1];
        }
      }
      if (previewUrl) {
        imageId = this._extractImageId(previewUrl);
        if (!imageId) {
          const urlParts = downloadPageUrl.split("/");
          imageId = urlParts[urlParts.length - 2] || "fallback-id";
        }
      }
      return {
        imageId: imageId,
        previewUrl: previewUrl
      };
    } catch (e) {
      console.error("❌ Failed to get image token:", e.message);
      return {
        imageId: null,
        previewUrl: null
      };
    }
  }
  _generateDirectUrl(previewUrl, imageId) {
    if (!previewUrl || !imageId) {
      return null;
    }
    let directUrl = "";
    try {
      if (previewUrl.includes("https://c4.") && previewUrl.includes("-preview.jpg")) {
        directUrl = previewUrl.replace("-preview.jpg", `.jpg`).replace("https://c4", "https://r4");
      } else if (previewUrl.includes("-preview.jpg")) {
        directUrl = previewUrl.replace("-preview.jpg", `.jpg`).replace("https://c", "https://r");
      } else if (previewUrl.includes("/preview/")) {
        directUrl = previewUrl.replace(".jpg", `.jpg`).replace("/preview/", "/path/").replace("https://c", "https://r");
      } else {
        directUrl = previewUrl.replace("https://c", "https://r");
      }
      return directUrl;
    } catch (e) {
      console.error("❌ Error generating direct URL:", e.message);
      return null;
    }
  }
  async _getResolutionList(id) {
    try {
      const dlgUrl = `${this.base}/dlg-${id}`;
      const {
        data
      } = await axios.get(dlgUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const items = [];
      $('a[href*="/download"]').each((i, el) => {
        const resolution = $(el).text()?.trim();
        const href = $(el).attr("href");
        let category = "Unknown";
        const parent = $(el).parent();
        const prevHeader = parent.prevAll("h2, h3").first();
        if (prevHeader.length) category = prevHeader.text().trim();
        else {
          const listHeader = $(el).closest("ul").prev("h2, h3");
          if (listHeader.length) category = listHeader.text().trim();
        }
        if (resolution && href) {
          const fullUrl = href.startsWith("http") ? href : `${this.base}${href}`;
          items.push({
            resolution: resolution,
            url: fullUrl,
            category: category
          });
        }
      });
      return items;
    } catch (e) {
      console.error("⚠️ Failed to fetch resolution list");
      return [];
    }
  }
  async _getDirectLink(downloadPageUrl) {
    try {
      const {
        imageId,
        previewUrl
      } = await this._getImageToken(downloadPageUrl);
      if (!imageId || !previewUrl) {
        const {
          data
        } = await axios.get(downloadPageUrl, {
          headers: {
            ...this.headers,
            "x-requested-with": null
          }
        });
        const $ = cheerio.load(data);
        const finalImageSelectors = ["#show_img", "#wallpaper", "#main_wallpaper", ".wallpaper"];
        for (const selector of finalImageSelectors) {
          const finalImage = $(selector).attr("src");
          if (finalImage) {
            return finalImage;
          }
        }
        return null;
      }
      const directUrl = this._generateDirectUrl(previewUrl, imageId);
      if (!directUrl) {
        return null;
      }
      try {
        const response = await axios.head(directUrl, {
          timeout: 1e4
        });
        if (response.status === 200) {
          return directUrl;
        }
      } catch (verifyError) {
        return directUrl;
      }
      return directUrl;
    } catch (e) {
      console.error("❌ Failed to get direct link:", e.message);
      return null;
    }
  }
  async search({
    url,
    query,
    limit = 5,
    detail = true,
    download = true,
    ratio = null,
    ...rest
  }) {
    try {
      const endpoint = url || `${this.base}/search`;
      const params = url ? this.parseUrl(url).params : {
        wallpaper: query,
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
      $("#gallery > li").each((i, el) => {
        if (i >= limit) return false;
        const $el = $(el);
        const link = $el.find('a[itemprop="url"]').attr("href");
        const img = $el.find("img.lazy").attr("data-src") || $el.find("img").attr("src");
        const title = $el.find("figcaption").text()?.trim();
        const res = $el.find(".res").text()?.trim();
        const fullUrl = link ? link.startsWith("http") ? link : `${this.base}${link}` : null;
        items.push({
          title: title,
          res: res,
          img: img,
          url: fullUrl
        });
      });
      if (detail) {
        for (let item of items) {
          if (item.url) {
            item.detail = await this.detail({
              url: item.url
            });
            if (download && item.detail && item.detail.available_resolutions) {
              item.downloads = await this.download({
                url: item.url,
                ratio: ratio
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
      const title = $("h1.view_h1").text()?.trim() || null;
      const preview = $("#vimg, #wallpaper").attr("src") || null;
      const res = $(".o_tips span").first().text()?.replace(/Size:\s*/i, "").trim() || null;
      const size = $(".o_tips span").eq(1).text()?.replace(/File size:\s*/i, "").trim() || null;
      const tags = [];
      $("#tagul a, .tag_it a").each((i, el) => {
        tags.push($(el).text()?.trim());
      });
      const resolutions = await this._getResolutionList(id);
      return {
        title: title,
        preview: preview,
        res: res,
        size: size,
        tags: tags,
        available_resolutions: resolutions.map(r => r.resolution),
        resolutions: resolutions,
        url: full
      };
    } catch (e) {
      console.error("❌ Detail error:", e.message);
      return null;
    }
  }
  async download({
    url,
    ratio = null
  }) {
    try {
      const {
        id
      } = this.parseUrl(url);
      const resolutions = await this._getResolutionList(id);
      if (!resolutions.length) {
        return {
          message: "No resolutions found",
          resolutions: []
        };
      }
      if (ratio) {
        const target = resolutions.find(r => r.resolution === ratio);
        if (target) {
          const directLink = await this._getDirectLink(target.url);
          return {
            resolution: target.resolution,
            category: target.category,
            download_page: target.url,
            direct_link: directLink,
            all_resolutions: resolutions.map(r => r.resolution)
          };
        } else {
          console.log(`⚠️ Ratio ${ratio} not found, returning all resolutions`);
        }
      }
      const resolutionsWithDirectLinks = [];
      for (const res of resolutions) {
        const directLink = await this._getDirectLink(res.url);
        resolutionsWithDirectLinks.push({
          resolution: res.resolution,
          category: res.category,
          download_page: res.url,
          direct_link: directLink
        });
      }
      return {
        total_resolutions: resolutionsWithDirectLinks.length,
        resolutions: resolutionsWithDirectLinks
      };
    } catch (e) {
      console.error("❌ Download error:", e.message);
      return {
        error: e.message,
        resolutions: []
      };
    }
  }
  async getAllResolutions({
    url
  }) {
    try {
      const {
        id
      } = this.parseUrl(url);
      const resolutions = await this._getResolutionList(id);
      return {
        total_resolutions: resolutions.length,
        resolutions: resolutions.map(res => ({
          resolution: res.resolution,
          category: res.category,
          download_page: res.url
        }))
      };
    } catch (e) {
      console.error("❌ GetAllResolutions error:", e.message);
      return {
        error: e.message,
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
  const scraper = new WallpaperFlare();
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
        response = await scraper._getDirectLink(params.url);
        break;
      case "all-resolutions":
        if (!params.url) {
          return res.status(400).json({
            error: "Parameter 'url' wajib diisi untuk action 'all-resolutions'."
          });
        }
        response = await scraper.getAllResolutions(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'detail', 'download', 'direct', 'all-resolutions'.`
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