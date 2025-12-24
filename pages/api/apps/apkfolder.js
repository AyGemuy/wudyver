import axios from "axios";
import * as cheerio from "cheerio";
class SearchScraper {
  constructor(baseURL = "https://apkfolder.io") {
    this.baseURL = baseURL;
  }
  async search(query, limit = 10) {
    try {
      const {
        data
      } = await axios.get(`${this.baseURL}/?s=${query}`);
      const $ = cheerio.load(data);
      return $("#primary .app-block").slice(0, limit).map((_, elem) => ({
        title: $(elem).find(".app-title").text().trim(),
        link: $(elem).find(".app-title").attr("href"),
        img: $(elem).find("img").attr("src"),
        stats: $(elem).find(".app-stats").text().trim() || "N/A",
        date: $(elem).find(".app-posted-date").text().trim() || "N/A"
      })).get();
    } catch (error) {
      console.error("Error during search:", error.message);
      return [];
    }
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const appData = {
        title: $("h2").first().text() || "No Title Available",
        category: $(".cat-links a").map((i, el) => $(el).text()).get().join(", ") || "No Category Available",
        req: $(".app-info-box").eq(1).text().trim() || "No Requirements Available",
        version: $(".app-info-box").eq(2).text().trim() || "No Version Available",
        developer: $(".app-info-box").eq(3).text().trim() || "No Developer Info Available",
        size: $(".app-info-box").eq(4).text().trim() || "No Size Info Available",
        price: $(".app-info-box").eq(5).text().trim() || "No Price Info Available",
        desc: $("p").eq(4).text() || "No Description Available",
        name: $("h2").text() || "No name available",
        icon: $(".app-icon-single img").attr("src") || "No icon available",
        categories: $(".cat-links").text().trim() || "No categories available",
        downloadLink: $(".single-app-download a").attr("href") || "No download link available"
      };
      return {
        ...appData,
        ...await this.download(appData.downloadLink)
      };
    } catch (error) {
      console.error("Error during detail fetch:", error.message);
      return [];
    }
  }
  async download(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      return {
        title: $("h3.text-center").text() || "No title available",
        dlLink: $(".btn-success").attr("href") || "No download link available",
        buttonText: $(".btn-success strong").text() || "No button text available",
        verText: $("svg + span").text().trim() || "No verification info available",
        verIcon: $("svg.bi-shield-shaded").attr("fill") || "No icon color available"
      };
    } catch (error) {
      console.error("Error during download fetch:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    limit
  } = req.method === "GET" ? req.query : req.body;
  const apk = new SearchScraper();
  if (!action) {
    return res.status(400).json({
      error: 'Paramenter "action" wajib diisi (search atau detail).'
    });
  }
  try {
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: 'Paramenter "query" wajib diisi untuk pencarian.'
        });
        result = await apk.search(query, limit);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: 'Paramenter "url" wajib diisi untuk unduhan.'
        });
        result = await apk.detail(url);
        break;
      default:
        return res.status(400).json({
          error: 'Action tidak valid. Gunakan "search" atau "detail".'
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}