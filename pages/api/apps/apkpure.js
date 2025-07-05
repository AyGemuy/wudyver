import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class ApkPure {
  constructor() {
    this.baseHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }
  async search(query) {
    try {
      const url = `https://apkpure.com/id/search?q=${query}`;
      const response = await axios.get(`${this.baseHtml}${url}`);
      const $ = cheerio.load(response.data);
      return $("#search-app-list .search-res li").map((_, el) => ({
        title: $(el).find(".p1").text().trim(),
        developer: $(el).find(".p2").text().trim(),
        rating: $(el).find(".star").text().trim(),
        link: $(el).find("a.dd").attr("href"),
        thumb: $(el).find("img").attr("src")
      })).get();
    } catch (error) {
      console.error("Error fetching search results:", error);
      return [];
    }
  }
  async detail(url) {
    try {
      const response = await axios.get(`${this.baseHtml}${url}`);
      const $ = cheerio.load(response.data);
      const main = $("main.dt-details-new-box");
      const downloadLink = main.find(".download_apk_news").attr("href");
      const meta = this.extractMeta($);
      return {
        title: main.find("h1").text().trim(),
        developer: main.find(".developer a").text().trim(),
        version: main.find(".version-name span").text().trim(),
        rating: main.find(".stars").text().trim(),
        updateDate: main.find(".dev-partnership-head-info li").eq(1).find(".head").text().trim(),
        androidOS: main.find(".dev-partnership-head-info li").eq(2).find(".head").text().trim(),
        downloadLink: downloadLink || "Tidak tersedia",
        media: downloadLink ? await this.getDownloadData(downloadLink) : null,
        ...meta
      };
    } catch (error) {
      console.error("Error fetching app details:", error);
      return null;
    }
  }
  async getDownloadData(link) {
    try {
      const response = await axios.get(`${this.baseHtml}${link}`);
      const $ = cheerio.load(response.data);
      const meta = this.extractMeta($);
      return {
        title: $(".download-process-box .download-content h2").text().trim() || "Status tidak tersedia",
        link: $(".download-fallback a#download_link").attr("href") || "",
        variants: $("#version-list .apk").map((_, el) => ({
          version: $(el).find(".info-top .name").text().trim(),
          code: $(el).find(".info-top .code").text().trim(),
          size: $(el).find(".info-bottom .size").text().trim(),
          version: $(el).find(".info-bottom .sdk").text().trim(),
          link: $(el).find(".download-btn").attr("href")
        })).get(),
        ...meta
      };
    } catch (error) {
      console.error("Error fetching download data:", error);
      return null;
    }
  }
  extractMeta($) {
    const meta = {};
    $("meta").each((_, el) => {
      const name = $(el).attr("name") || $(el).attr("property");
      if (name) {
        meta[name] = $(el).attr("content");
      }
    });
    return meta;
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const apk = new ApkPure();
  try {
    switch (action) {
      case "search":
        return res.status(200).json(await apk.search(query));
      case "detail":
        return res.status(200).json(await apk.detail(url));
      default:
        return res.status(400).json({
          message: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}