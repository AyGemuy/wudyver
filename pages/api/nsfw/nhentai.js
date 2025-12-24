import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
const proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v19?url=`;
console.log("CORS proxy", proxy);
class NHentaiScraper {
  constructor() {
    this.baseUrl = "https://nhentai.net";
    this.proxy = url => `${proxy}${url.startsWith("http") ? "" : this.baseUrl}${url}`;
  }
  async request(url) {
    const proxied = this.proxy(url);
    try {
      const {
        data
      } = await axios.get(proxied, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: this.baseUrl,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        timeout: 2e4
      });
      return data;
    } catch (err) {
      throw new Error(`Request failed: ${err.message}`);
    }
  }
  async home() {
    try {
      const data = await this.request("/");
      const $ = cheerio.load(data);
      const galleries = [];
      $(".index-container .gallery").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.cover");
        const url = $link.attr("href") || "";
        if (!url) return;
        const galleryId = url.match(/\/g\/(\d+)\//)?.[1] || "";
        const title = $el.find(".caption").text().trim() || "No title";
        const $img = $link.find("img");
        let thumbnail = $img.attr("data-src") || $img.attr("src") || "";
        if (!thumbnail) {
          thumbnail = $link.find("noscript img").attr("src") || "";
        }
        const dataTags = $el.attr("data-tags") || "";
        const tagIds = dataTags ? dataTags.split(" ").map(id => id.trim()).filter(Boolean) : [];
        const padding = $link.attr("style")?.match(/padding:0 0 ([\d.]+)%/)?.[1] || "0";
        const aspectRatio = padding ? parseFloat(padding) : 0;
        galleries.push({
          galleryId: galleryId,
          title: title.length > 120 ? title.substring(0, 117) + "..." : title,
          url: this.baseUrl + url,
          thumbnail: thumbnail.startsWith("//") ? "https:" + thumbnail : thumbnail,
          tagIds: tagIds,
          aspectRatio: aspectRatio
        });
      });
      const sectionTitle = $(".index-container h2").first().text().trim() || "Popular Now";
      return {
        galleries: galleries,
        total: galleries.length,
        sectionTitle: sectionTitle
      };
    } catch (error) {
      console.error("Home error:", error.message);
      return {
        galleries: [],
        total: 0,
        sectionTitle: "Error"
      };
    }
  }
  async search({
    query = "",
    page = 1
  }) {
    try {
      const path = `/search/?q=${encodeURIComponent(query)}&page=${page}`;
      const data = await this.request(path);
      const $ = cheerio.load(data);
      const galleries = [];
      $(".index-container .gallery").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.cover");
        const url = $link.attr("href") || "";
        if (!url) return;
        const galleryId = url.match(/\/g\/(\d+)\//)?.[1] || "";
        const title = $el.find(".caption").text().trim() || "No title";
        const $img = $link.find("img");
        let thumbnail = $img.attr("data-src") || $img.attr("src") || "";
        if (!thumbnail) {
          thumbnail = $link.find("noscript img").attr("src") || "";
        }
        const dataTags = $el.attr("data-tags") || "";
        const tagIds = dataTags ? dataTags.split(" ").map(id => id.trim()).filter(Boolean) : [];
        const padding = $link.attr("style")?.match(/padding:0 0 ([\d.]+)%/)?.[1] || "0";
        const aspectRatio = padding ? parseFloat(padding) : 0;
        galleries.push({
          galleryId: galleryId,
          title: title.length > 120 ? title.substring(0, 117) + "..." : title,
          url: this.baseUrl + url,
          thumbnail: thumbnail.startsWith("//") ? "https:" + thumbnail : thumbnail,
          tagIds: tagIds,
          aspectRatio: aspectRatio
        });
      });
      const hasMore = !!$(".pagination .next").length;
      const resultText = $("h1").text();
      const totalMatch = resultText.match(/(\d+)\s+results/i);
      const totalResults = totalMatch ? parseInt(totalMatch[1]) : galleries.length;
      return {
        galleries: galleries,
        total: galleries.length,
        totalResults: totalResults,
        searchQuery: query,
        page: Number(page),
        hasMore: hasMore
      };
    } catch (error) {
      console.error("Search error:", error.message);
      return {
        galleries: [],
        total: 0,
        totalResults: 0,
        searchQuery: query,
        page: page,
        hasMore: false
      };
    }
  }
  async detail({
    url = ""
  }) {
    try {
      const path = url.includes(this.baseUrl) ? url.replace(this.baseUrl, "") : url;
      const data = await this.request(path);
      const $ = cheerio.load(data);
      const titleBefore = $("#info h1 .before").text().trim();
      const titleMain = $("#info h1 .pretty").text().trim() || "No title";
      const titleAfter = $("#info h1 .after").text().trim();
      const fullTitle = `${titleBefore}${titleMain}${titleAfter}`.trim();
      const galleryId = $("#info h3").text().replace("#", "").trim() || "";
      const parodies = [];
      const characters = [];
      const tags = [];
      const artists = [];
      const groups = [];
      const languages = [];
      const categories = [];
      $("#tags .tag-container").each((_, container) => {
        const $container = $(container);
        const fieldName = $container.find(".field-name").text().replace(":", "").trim().toLowerCase();
        const isHidden = $container.hasClass("hidden");
        $container.find(".tag").each((_, tag) => {
          const $tag = $(tag);
          const tagName = $tag.find(".name").text().trim();
          const tagCount = $tag.find(".count").text().trim();
          const tagUrl = $tag.attr("href") || "";
          const tagClass = $tag.attr("class") || "";
          const tagId = tagClass.match(/tag-(\d+)/)?.[1] || "";
          const tagData = {
            name: tagName,
            count: tagCount,
            url: tagUrl,
            id: tagId
          };
          if (fieldName.includes("parodies")) parodies.push(tagData);
          else if (fieldName.includes("characters")) characters.push(tagData);
          else if (fieldName.includes("tags")) tags.push(tagData);
          else if (fieldName.includes("artists")) artists.push(tagData);
          else if (fieldName.includes("groups")) groups.push(tagData);
          else if (fieldName.includes("languages")) languages.push(tagData);
          else if (fieldName.includes("categories")) categories.push(tagData);
        });
      });
      const pagesText = $(".tag-container:contains('Pages') .tag .name").text().trim() || "0";
      const pagesLink = $(".tag-container:contains('Pages') .tag").attr("href") || "";
      const pages = parseInt(pagesText) || 0;
      const $uploadTime = $(".tag-container:contains('Uploaded') time");
      const uploaded = $uploadTime.attr("datetime") || "";
      const uploadedTitle = $uploadTime.attr("title") || "";
      const uploadedDisplay = $uploadTime.text().trim();
      const $favBtn = $(".buttons .btn-primary");
      const favorites = $favBtn.find("span").text().match(/\((\d+)\)/)?.[1] || "0";
      const isFavoriteDisabled = $favBtn.hasClass("btn-disabled");
      const $downloadBtn = $("#download");
      const isDownloadDisabled = $downloadBtn.hasClass("btn-disabled");
      const $coverImg = $("#cover img");
      let cover = $coverImg.attr("data-src") || $coverImg.attr("src") || "";
      if (!cover) {
        cover = $("#cover noscript img").attr("src") || "";
      }
      const pageImages = [];
      $("#thumbnail-container .thumb-container").each((idx, el) => {
        const $el = $(el);
        const $link = $el.find("a");
        const pageUrl = $link.attr("href") || "";
        const pageNum = pageUrl.match(/\/(\d+)\/$/)?.[1] || (idx + 1).toString();
        const $img = $link.find("img");
        let thumbImg = $img.attr("data-src") || $img.attr("src") || "";
        if (!thumbImg) {
          thumbImg = $link.find("noscript img").attr("src") || "";
        }
        const width = $img.attr("width") || "";
        const height = $img.attr("height") || "";
        pageImages.push({
          page: pageNum,
          thumbnail: thumbImg.startsWith("//") ? "https:" + thumbImg : thumbImg,
          url: this.baseUrl + pageUrl,
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null
        });
      });
      const relatedGalleries = [];
      $("#related-container .gallery").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.cover");
        const relUrl = $link.attr("href") || "";
        const relId = relUrl.match(/\/g\/(\d+)\//)?.[1] || "";
        const relTitle = $el.find(".caption").text().trim();
        const $img = $link.find("img");
        let relThumb = $img.attr("data-src") || $img.attr("src") || "";
        if (!relThumb) {
          relThumb = $link.find("noscript img").attr("src") || "";
        }
        const dataTags = $el.attr("data-tags") || "";
        const relTagIds = dataTags ? dataTags.split(" ").filter(Boolean) : [];
        if (relId) {
          relatedGalleries.push({
            galleryId: relId,
            title: relTitle,
            url: this.baseUrl + relUrl,
            thumbnail: relThumb.startsWith("//") ? "https:" + relThumb : relThumb,
            tagIds: relTagIds
          });
        }
      });
      return {
        galleryId: galleryId,
        title: titleMain,
        fullTitle: fullTitle,
        titleBefore: titleBefore,
        titleAfter: titleAfter,
        url: this.baseUrl + path,
        cover: cover.startsWith("//") ? "https:" + cover : cover,
        pages: pages,
        pagesLink: pagesLink,
        uploaded: {
          datetime: uploaded,
          title: uploadedTitle,
          display: uploadedDisplay
        },
        favorites: Number(favorites),
        isFavoriteDisabled: isFavoriteDisabled,
        isDownloadDisabled: isDownloadDisabled,
        parodies: parodies,
        characters: characters,
        tags: tags,
        artists: artists,
        groups: groups,
        languages: languages,
        categories: categories,
        pageImages: pageImages,
        relatedGalleries: relatedGalleries,
        totalRelated: relatedGalleries.length
      };
    } catch (error) {
      console.error("Detail error:", error.message);
      return {
        galleryId: "",
        title: "Error",
        fullTitle: "Error",
        titleBefore: "",
        titleAfter: "",
        url: url,
        cover: "",
        pages: 0,
        pagesLink: "",
        uploaded: {
          datetime: "",
          title: "",
          display: ""
        },
        favorites: 0,
        isFavoriteDisabled: true,
        isDownloadDisabled: true,
        parodies: [],
        characters: [],
        tags: [],
        artists: [],
        groups: [],
        languages: [],
        categories: [],
        pageImages: [],
        relatedGalleries: [],
        totalRelated: 0
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const scraper = new NHentaiScraper();
  try {
    let result;
    switch (action) {
      case "home":
        result = await scraper.home();
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib."
          });
        }
        result = await scraper.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            error: "Paramenter 'url' wajib."
          });
        }
        result = await scraper.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
}