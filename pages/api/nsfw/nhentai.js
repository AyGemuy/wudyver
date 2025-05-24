import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Nhentai {
  constructor() {
    this.baseProxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
    this.baseHentai = "https://nhentai.net";
  }
  proxyURL(endpoint) {
    return `${this.baseProxy}${endpoint}`;
  }
  hetaiUrl(endpoint) {
    return `${this.baseHentai}${endpoint}`;
  }
  async fetchData(url) {
    try {
      const response = await axios.get(url);
      return cheerio.load(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  }
  async search(query, page, limit = 5) {
    const url = this.proxyURL(`${encodeURIComponent(this.hetaiUrl(`/search/?q=${query}&sort=popular${page ? `&page=${page}` : ""}`))}`);
    const $ = await this.fetchData(url);
    return $ ? $(".gallery").map((_, element) => ({
      title: $(element).find(".caption").text().trim(),
      imgSrc: $(element).find("img.lazyload").data("src"),
      link: this.hetaiUrl($(element).find("a.cover").attr("href"))
    })).get().slice(0, limit) : [];
  }
  async detail(inputUrl, limit = 5) {
    const url = this.proxyURL(`${encodeURIComponent(inputUrl)}`);
    const $ = await this.fetchData(url);
    if (!$) return null;
    const details = {
      title: $("h1.title .pretty").text().trim() || "No Title",
      subtitle: $("h2.title .pretty").text().trim() || "No Subtitle",
      galleryId: $("h3#gallery_id").text().trim().replace("#", "") || "No ID",
      image: $('meta[property="og:image"]').attr("content") || "",
      description: $('meta[name="description"]').attr("content") || "",
      uploaded: $('#tags .tag-container:contains("Uploaded") time').attr("datetime") || "Unknown",
      pages: $('#tags .tag-container:contains("Pages") .tags .name').text().trim() || "0",
      thumbnails: [],
      pageImages: []
    };
    const tags = {};
    $("#tags .tag-container").each((_, elem) => {
      const category = $(elem).text().trim().split(":")[0];
      tags[category] = $(elem).find(".tags a").map((_, tagElem) => ({
        name: $(tagElem).find(".name").text().trim(),
        count: $(tagElem).find(".count").text().trim()
      })).get();
    });
    details.tags = tags;
    const thumbLinks = $("#thumbnail-container .thumb-container a").map((_, element) => this.hetaiUrl($(element).attr("href"))).get();
    details.thumbnails = thumbLinks.map(link => ({
      link: link
    }));
    details.pageImages = await Promise.all(thumbLinks.map(async link => {
      const $ = await this.fetchData(this.proxyURL(`${encodeURIComponent(link)}`));
      return $ ? $("#image-container img").map((_, element) => $(element).attr("src")).get() : [];
    })).then(images => images.flat().slice(0, limit));
    return details;
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    page,
    limit,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new Nhentai();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await downloader.search(query, page, limit);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await downloader.detail(url, limit);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}