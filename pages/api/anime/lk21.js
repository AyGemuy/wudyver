import axios from "axios";
import * as cheerio from "cheerio";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class LK21 {
  constructor() {
    this.api = {
      base: "https://lk21.film",
      download: "https://dl.lk21.party",
      endpoints: {
        search: "/search.php?s={query}",
        download: {
          page: "/get/{slug}",
          verify: "/verifying.php?slug={slug}"
        }
      },
      headers: {
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
      }
    };
  }
  cleanTitle(title) {
    return title.replace("LK21 NONTON ", "").trim();
  }
  fixUrl(url) {
    if (!url) return "";
    return url.startsWith("//") ? `https:${url}` : url;
  }
  isValidUrl(url) {
    try {
      return url.startsWith(this.api.base);
    } catch {
      return false;
    }
  }
  async search(query) {
    if (!query?.trim()) {
      return {
        status: false,
        code: 400,
        result: {
          error: "Querynya mana? Input judul filmnya!"
        }
      };
    }
    try {
      const url = this.api.base + this.api.endpoints.search.replace("{query}", encodeURIComponent(query));
      const response = await axios.get(url, {
        headers: this.api.headers
      });
      const $ = cheerio.load(response.data);
      const results = [];
      $(".search-item").each((_, el) => {
        const $el = $(el);
        const $content = $el.find(".search-content");
        const $poster = $el.find(".search-poster");
        const $link = $content.find("h3 a");
        if (!$link.length) return;
        const mv = $link.attr("href") || "";
        const title = this.cleanTitle($link.text().trim());
        if (!mv || mv.includes("/director/") || title.toLowerCase().includes("series") || mv.includes("/series/")) return;
        let thumbnail = this.fixUrl($poster.find("img").attr("src") || "");
        const link = mv.startsWith("http") ? mv : this.api.base + mv;
        const metadata = {};
        $content.find("p").each((_, p) => {
          const text = $(p).text().trim();
          if (text.includes("Genres")) metadata.genres = text.replace("Genres:", "").trim();
          if (text.includes("Negara")) metadata.country = text.replace("Negara:", "").trim();
          if (text.includes("Rating")) metadata.rating = text.replace("Rating:", "").trim();
          if (text.includes("Kualitas")) metadata.quality = text.replace("Kualitas:", "").trim();
          if (text.includes("Tahun")) metadata.year = text.replace("Tahun:", "").trim();
        });
        if (Object.values(metadata).some(val => val.toLowerCase().includes("series"))) return;
        results.push({
          title: title,
          url: link,
          thumbnail: thumbnail,
          ...metadata
        });
      });
      return results.length ? {
        status: true,
        code: 200,
        result: {
          query: query,
          total: results.length,
          movies: results
        }
      } : {
        status: false,
        code: 404,
        result: {
          error: `Film "${query}" tidak ditemukan.`
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Error saat mencari film."
        }
      };
    }
  }
  async getDetails(url) {
    if (!url?.trim() || !this.isValidUrl(url)) {
      return {
        status: false,
        code: 400,
        result: {
          error: "Link tidak valid atau kosong."
        }
      };
    }
    try {
      const response = await axios.get(url, {
        headers: this.api.headers
      });
      const $ = cheerio.load(response.data);
      const slug = url.split("/").filter(Boolean).pop();
      const movieInfo = {
        title: this.cleanTitle($(".social h1").text().trim()),
        poster: this.fixUrl($(".content-poster img").attr("src")),
        quality: $('.toggle-more h3 a[href*="/quality/"]').text().trim(),
        country: $('.toggle-more h3 a[href*="/country/"]').text().trim(),
        cast: [],
        director: [],
        genre: [],
        rating: "",
        duration: "",
        releaseDate: "",
        synopsis: ""
      };
      $(".toggle-more .content div").each((_, el) => {
        const label = $(el).find("h2").text().trim().toLowerCase();
        $(el).find("h3 a").each((_, a) => {
          const text = $(a).text().trim();
          if (label === "bintang film") movieInfo.cast.push(text);
          if (label === "sutradara") movieInfo.director.push(text);
          if (label === "genre") movieInfo.genre.push(text);
        });
        if (label === "imdb") movieInfo.rating = $(el).find("h3").text().split("/")[0].trim();
        if (label === "durasi") movieInfo.duration = $(el).find("h3").text().trim();
        if (label === "diterbitkan") movieInfo.releaseDate = $(el).find("h3").text().trim();
      });
      movieInfo.synopsis = $("blockquote").text().replace(/Synopsis|Budget:.*$/, "").trim();
      await delay(1e3);
      const links = await this.getDlink(slug);
      if (links.status) {
        movieInfo.streaming = links.result.streaming;
        movieInfo.dlink = links.result.download;
      }
      return {
        status: true,
        code: 200,
        result: {
          movie: movieInfo
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Error mengambil detail film."
        }
      };
    }
  }
  async getDlink(slug) {
    if (!slug?.trim()) {
      return {
        status: false,
        code: 400,
        result: {
          error: "Slug tidak valid."
        }
      };
    }
    try {
      const url = this.api.download + this.api.endpoints.download.page.replace("{slug}", slug);
      const response = await axios.get(url, {
        headers: this.api.headers
      });
      const $ = cheerio.load(response.data);
      let validateToken = null;
      $("script").each((_, script) => {
        const match = $(script).html().match(/setCookie\('validate',\s*'([^']+)'/);
        if (match) validateToken = match[1];
      });
      if (!validateToken) throw new Error("Token validasi tidak ditemukan.");
      await delay(1e3);
      const verifyResponse = await axios.post(this.api.download + this.api.endpoints.download.verify.replace("{slug}", slug), new URLSearchParams({
        slug: slug
      }).toString(), {
        headers: {
          ...this.api.headers,
          Cookie: `validate=${validateToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const $verify = cheerio.load(verifyResponse.data);
      const dlink = [],
        streaming = [];
      $verify('a[href*="//"]').each((_, el) => {
        const url = $verify(el).attr("href");
        if (!url) return;
        const provider = new URL(url).hostname.split(".")[0].toUpperCase();
        (url.includes("lk21.de") ? streaming : dlink).push({
          provider: provider,
          url: url
        });
      });
      return dlink.length || streaming.length ? {
        status: true,
        code: 200,
        result: {
          streaming: streaming,
          download: dlink
        }
      } : {
        status: false,
        code: 404,
        result: {
          error: "Tidak ada link download atau streaming."
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Error mendapatkan link download."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    slug
  } = req.method === "GET" ? req.query : req.body;
  try {
    switch (action) {
      case "search":
        if (!query) throw {
          code: 400,
          error: "Query parameter is required"
        };
        return res.json(await new Lk21().search(query));
      case "details":
        if (!url) throw {
          code: 400,
          error: "URL parameter is required"
        };
        return res.json(await new Lk21().details(url));
      case "download":
        if (!slug) throw {
          code: 400,
          error: "Slug parameter is required"
        };
        return res.json(await new Lk21().getDlink(slug));
      default:
        throw {
          code: 400,
            error: "Invalid action"
        };
    }
  } catch (error) {
    return res.status(error.code || 500).json({
      status: false,
      error: error.error || "Internal Server Error"
    });
  }
}