import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class ApkTools {
  constructor() {
    this.baseHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
    this.baseHtmlV = `https://${apiConfig.DOMAIN_URL}/api/tools/web/proxy/v3?method=GET&url=`;
    this.baseSearch = "https://apk.tools/search/";
    this.resultBaseLink = "https://apk.tools";
  }
  async search(q) {
    try {
      const res = await axios.get(this.baseHtml + (this.baseSearch + q));
      const $ = cheerio.load(res.data);
      return $(".main-list .col-3").map((_, el) => ({
        title: $(el).find("h2").text(),
        rating: $(el).find(".star-ratings small span").text(),
        category: $(el).find(".info-list div span").last().text(),
        version: $(el).find(".info-list div span").first().text(),
        icon: $(el).find("img").attr("data-src"),
        link: this.resultBaseLink + $(el).find("a").attr("href")
      })).get();
    } catch (e) {
      return {
        error: "Gagal mengambil hasil pencarian"
      };
    }
  }
  async detail(url) {
    try {
      const res = await axios.get(this.baseHtml + url);
      const $ = cheerio.load(res.data);
      const downloadLink = this.resultBaseLink + $(".download-btn-bottom a.btn.btn-down").attr("href") || "";
      const details = {
        title: $(".app-info .title").text(),
        rating: $('.star-ratings small span[itemprop="ratingValue"]').text(),
        version: $('.version[itemprop="version"]').text(),
        size: $('.tech-info td:contains("Size") + td').text(),
        developer: $('.tech-info td:contains("Developer") + td a').text(),
        category: $('.tech-info td:contains("Category") + td').text(),
        packageName: $('.tech-info td:contains("Package Name") + td a').text(),
        os: $('.tech-info td:contains("OS") + td').text(),
        description: $('.desc-hide[itemprop="description"]').html(),
        screenshots: $(".screenshots img").map((_, img) => $(img).attr("data-src")).get(),
        downloadLink: downloadLink,
        oldVersions: $(".old-versions tbody tr").map((_, row) => ({
          version: $(row).find("td").first().text().trim(),
          size: $(row).find("td").eq(1).text().trim(),
          update: $(row).find("td").eq(2).text().trim(),
          link: this.resultBaseLink + $(row).find("a.link").attr("href")
        })).get()
      };
      if (downloadLink) details.variants = await this.getVariant(downloadLink);
      return details;
    } catch (e) {
      return {
        error: "Gagal mengambil detail aplikasi"
      };
    }
  }
  async getVariant(link) {
    try {
      const res = await axios.get(this.baseHtmlV + link);
      const $ = cheerio.load(res.data);
      const variants = $(".variants tbody tr").map((_, row) => ({
        version: $(row).find("td").first().text().trim(),
        size: $(row).find("td").eq(1).text().trim(),
        os: $(row).find("td").eq(2).text().trim() || "N/A",
        cpu: $(row).find("td").eq(3).text().trim() || "N/A",
        update: $(row).find("td").eq(4).text().trim(),
        link: this.resultBaseLink + $(row).find("a.link").attr("href")
      })).get();
      return await Promise.all(variants.map(async v => ({
        ...v,
        ...await this.getVariantDetail(v.link)
      })));
    } catch (e) {
      return {
        error: "Gagal mengambil varian aplikasi"
      };
    }
  }
  async getVariantDetail(link) {
    try {
      const res = await axios.get(this.baseHtmlV + link);
      const $ = cheerio.load(res.data);
      return {
        packageName: $('.tech-info td:contains("Packagename") + td').text(),
        versionCode: $('.tech-info td:contains("Version code") + td').text(),
        sdk: $('.tech-info td:contains("SDK") + td').text(),
        targetSdk: $('.tech-info td:contains("Target SDK") + td').text(),
        filename: $('.tech-info td:contains("Filename") + td').text(),
        permissions: $('.tech-info td:contains("Permissions") + td').html()?.split("<br>").map(p => p.trim()) || [],
        downloadLink: this.resultBaseLink + $(".app-box .tc .link").attr("href") || ""
      };
    } catch (e) {
      return {
        error: "Gagal mengambil detail varian"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const apk = new ApkTools();
  try {
    switch (action) {
      case "search":
        return res.status(200).json(await apk.search(query));
      case "detail":
        return res.status(200).json(await apk.detail(url));
      case "variant":
        return res.status(200).json(await apk.getVariant(url));
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