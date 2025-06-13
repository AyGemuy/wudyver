import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class ApkCombo {
  constructor() {
    this.baseHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
    this.baseUrl = "https://apkcombo.app";
  }
  async search(query) {
    try {
      const url = `${this.baseUrl}/id/search/${query}`;
      const {
        data
      } = await axios.get(`${this.baseHtml}${url}`);
      const $ = cheerio.load(data);
      return $(".content-apps .l_item").map((_, el) => ({
        title: $(el).find(".name").text().trim(),
        developer: $(el).find(".author").text().trim(),
        rating: $(el).find(".description span:nth-child(2)").text().trim(),
        downloads: $(el).find(".description span:nth-child(1)").text().trim(),
        size: $(el).find(".description span:nth-child(3)").text().trim(),
        link: `${this.baseUrl}${$(el).attr("href")}`,
        thumb: $(el).find("figure img").data("src")
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
      const infoSection = $(".info");
      const infoMeta = this.extractMeta($);
      const downloadElement = $(".download_apk_news");
      const buttonGroup = $(".button-group.mt-14.mb-14.is-mobile-only a.button.is-success.is-fullwidth");
      const oldVersionsSection = $("#old-versions");
      const appName = infoSection.find(".app_name h1 a").text().trim() || null;
      const version = infoSection.find(".version").text().trim() || null;
      const developer = infoSection.find(".author a").text().trim() || null;
      const downloadPage = buttonGroup.attr("href")?.trim() || null;
      const apkSize = buttonGroup.find(".fsize span").text().trim() || null;
      const oldVersions = oldVersionsSection.find(".list-versions.content li").map((_, el) => ({
        versionName: $(el).find(".vername").text().trim(),
        fileType: $(el).find(".vtype span").text().trim(),
        releaseDate: $(el).find(".description").text().split("·")[0].trim(),
        minAndroid: $(el).find(".description").text().split("·")[1].trim(),
        downloadLink: `${this.baseUrl}${$(el).find("a.ver-item").attr("href")}`,
        iconUrl: $(el).find("figure img").attr("data-src")
      })).get();
      const oldLink = oldVersionsSection.find(".more a").attr("href") ? `${this.baseUrl}${oldVersionsSection.find(".more a").attr("href")}` : null;
      const infoApp = {
        appName: appName,
        version: version,
        developer: developer,
        downloadPage: downloadPage ? `${this.baseUrl}${downloadPage}` : null,
        apkSize: apkSize,
        iconUrl: $(".apk_info_content img").attr("src"),
        oldVersions: oldVersions,
        oldLink: oldLink,
        ...infoMeta
      };
      if (infoApp.downloadPage) {
        infoApp.download = await this.getData(infoApp.downloadPage);
      }
      return infoApp;
    } catch (error) {
      console.error("Error fetching app details:", error);
      return null;
    }
  }
  async getData(link) {
    try {
      const response = await axios.get(`${this.baseHtml}${link}`);
      const $ = cheerio.load(response.data);
      const infoMeta = this.extractMeta($);
      return {
        meta: infoMeta,
        version: $(".content-tab-latest-version .file-list li").map((_, el) => ({
          version: $(el).find(".vername").text().trim(),
          code: $(el).find(".vercode").text().trim(),
          size: $(el).find(".spec.ltr").text().trim(),
          minSdk: $(el).find(".spec").eq(1).text().trim(),
          dpi: $(el).find(".spec").eq(2).text().trim(),
          link: `${this.baseUrl}${$(el).find("a").attr("href")}`
        })).get()
      };
    } catch (error) {
      console.error("Error fetching download data:", error);
      return [];
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
  const apk = new ApkCombo();
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