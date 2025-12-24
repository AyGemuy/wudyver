import axios from "axios";
import * as cheerio from "cheerio";
class RawAPKBeta {
  constructor(options = {}) {
    const baseUrl = options.baseUrl || "https://rawapk.com";
    const defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://rawapk.com/",
      "Upgrade-Insecure-Requests": "1"
    };
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        ...defaultHeaders,
        ...options.headers || {}
      }
    });
    console.log("Scraper instance created.");
  }
  async req(url) {
    console.log(`Proses: Mengambil data dari ${this.client.defaults.baseURL}${url}...`);
    try {
      const response = await this.client.get(url);
      console.log("Proses: Data berhasil diambil.");
      return response.data;
    } catch (error) {
      console.error("Error saat mengambil data:", error.message);
      return null;
    }
  }
  parseSearch(html) {
    console.log("Proses: Memulai parsing data pencarian...");
    const $ = cheerio.load(html);
    const results = [];
    $("div.article-container article").each((i, el) => {
      const element = $(el);
      const title = element.find("h2.entry-title a")?.attr("title") || "N/A";
      const url = element.find("h2.entry-title a")?.attr("href") || null;
      const thumbnailSrc = element.find(".featured-image img")?.attr("src");
      const thumbnail = thumbnailSrc ? thumbnailSrc : "N/A";
      const author = element.find(".byline .author a")?.text()?.trim() || "N/A";
      const datePublished = element.find(".posted-on time.published")?.attr("datetime") || "N/A";
      const dateUpdated = element.find(".posted-on time.updated")?.attr("datetime") || datePublished;
      const category = element.find(".cat-links a")?.text()?.trim() || "N/A";
      const categoryUrl = element.find(".cat-links a")?.attr("href") || null;
      const comments = element.find(".comments a")?.text()?.trim() || "0 Comments";
      const tags = (element.find(".tag-links a")?.map((i, tag) => $(tag).text().trim()).get() || []).join(", ");
      const description = element.find(".entry-content p")?.text()?.trim() || "N/A";
      results.push({
        title: title,
        url: url,
        thumbnail: thumbnail,
        author: author,
        datePublished: datePublished,
        dateUpdated: dateUpdated,
        category: category,
        categoryUrl: categoryUrl,
        comments: comments,
        tags: tags,
        description: description
      });
    });
    console.log(`Proses: Parsing selesai, ditemukan ${results.length} hasil.`);
    return results;
  }
  parseDetail(html, baseUrl = "https://rawapk.com") {
    console.log("Proses: Memulai parsing data detail...");
    const $ = cheerio.load(html);
    const mainArticle = $("article").first();
    const title = mainArticle.find("h1.entry-title").text().trim() || "N/A";
    const imgSrc = mainArticle.find(".featured-image img")?.attr("src");
    const thumbnail = imgSrc?.startsWith("http") ? imgSrc : imgSrc ? `${baseUrl}${imgSrc}` : "N/A";
    const category = mainArticle.find(".above-entry-meta .cat-links a").first().text().trim() || "N/A";
    const categoryUrl = mainArticle.find(".above-entry-meta .cat-links a").first().attr("href") || null;
    const author = mainArticle.find(".byline .author a").first().text().trim() || "N/A";
    const authorUrl = mainArticle.find(".byline .author a").first().attr("href") || null;
    const datePublished = mainArticle.find(".posted-on time.published").first().attr("datetime") || "N/A";
    const dateUpdated = mainArticle.find(".posted-on time.updated").first().attr("datetime") || datePublished;
    const tags = (mainArticle.find(".tag-links a")?.map((i, tag) => $(tag).text().trim()).get() || []).join(", ");
    const fileInfo = {};
    mainArticle.find("div.entry-content table tr").each((i, el) => {
      const row = $(el);
      const fullText = row.find("td").first()?.text()?.trim();
      const parts = fullText.split(/:(.*)/s);
      if (parts.length > 1) {
        const key = parts[0].trim().toLowerCase().replace(/\s+/g, "_");
        const value = parts[1].trim();
        if (key) fileInfo[key] = value;
      }
    });
    const downloads = [];
    mainArticle.find('form[method="get"]').each((i, el) => {
      const form = $(el);
      const url = form.attr("action");
      const text = form.find("button").text().trim();
      if (url && text) {
        const finalUrl = url.startsWith("//") ? `https:${url}` : url;
        downloads.push({
          text: text,
          url: finalUrl
        });
      }
    });
    const description = mainArticle.find("div.entry-content > p").filter((i, el) => {
      const p = $(el);
      const hasScript = p.find("script").length > 0;
      const text = p.text().trim();
      const isUnwanted = text.includes("Previous Versions:") || text.includes("All .APK files found");
      return !hasScript && !isUnwanted && text.length > 0;
    }).map((i, el) => $(el).text().trim()).get().join("\n");
    console.log("Proses: Parsing detail selesai.");
    return {
      title: title,
      thumbnail: thumbnail,
      category: category,
      categoryUrl: categoryUrl,
      author: author,
      authorUrl: authorUrl,
      datePublished: datePublished,
      dateUpdated: dateUpdated,
      tags: tags,
      fileInfo: fileInfo,
      description: description,
      downloads: downloads
    };
  }
  async search({
    query,
    ...rest
  }) {
    try {
      const searchUrl = `/?s=${encodeURIComponent(query || "")}`;
      const html = await this.req(searchUrl);
      const data = this.parseSearch(html || "");
      return {
        status: "success",
        query: query,
        results: data
      };
    } catch (error) {
      console.error("Error di dalam fungsi search:", error.message);
      return {
        status: "error",
        message: error.message,
        results: []
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    if (!url) {
      return {
        status: "error",
        message: "URL diperlukan"
      };
    }
    try {
      const urlPath = new URL(url).pathname;
      const html = await this.req(urlPath);
      if (!html) {
        return {
          status: "error",
          message: "Gagal mengambil konten HTML."
        };
      }
      const data = this.parseDetail(html, this.client.defaults.baseURL);
      return {
        status: "success",
        source: url,
        result: data
      };
    } catch (error) {
      console.error("Error di dalam fungsi detail:", error.message);
      return {
        status: "error",
        message: error.message
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
      error: "Action is required."
    });
  }
  const api = new RawAPKBeta();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Query are required for search."
          });
        }
        response = await api.search(params);
        return res.status(200).json(response);
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Url is required for detail."
          });
        }
        response = await api.detail(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'search', and 'detail'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}