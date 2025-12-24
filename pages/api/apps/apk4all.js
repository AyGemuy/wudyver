import axios from "axios";
import * as cheerio from "cheerio";
class Apk4AllScraper {
  constructor() {
    this.baseUrl = "https://apk4all.com.im";
    this.cookies = "";
  }
  async getCookies() {
    try {
      const {
        headers
      } = await axios.get(this.baseUrl);
      this.cookies = headers["set-cookie"]?.join("; ") || "";
    } catch {}
  }
  async search(query) {
    if (!this.cookies) await this.getCookies();
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query
        },
        headers: this.getHeaders()
      });
      return this.parseSearch(data);
    } catch {
      return [];
    }
  }
  parseSearch(html) {
    const $ = cheerio.load(html);
    return $(".app-list .col-4").map((_, el) => ({
      title: $(el).find(".title").text().trim() || "",
      developer: $(el).find(".developer").text().trim() || "",
      image: $(el).find("img.lazy").attr("data-src") || "",
      link: $(el).find("a").attr("href") || ""
    })).get().filter(app => Object.values(app).every(Boolean));
  }
  async detail(url) {
    if (!this.cookies) await this.getCookies();
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.getHeaders()
      });
      return this.parseDetail(data);
    } catch {
      return {};
    }
  }
  parseDetail(html) {
    const $ = cheerio.load(html);
    const playStoreLink = $('.app-details a[href*="play.google.com"]').attr("href") || "";
    let playStoreId = "";
    if (playStoreLink) {
      try {
        playStoreId = new URLSearchParams(new URL(playStoreLink).search).get("id") || "";
      } catch {}
    }
    return {
      version: $('.app-details .row div:contains("Version")').text().replace("Version", "").trim() || "",
      update: $('.app-details .row div:contains("Update")').text().replace("Update", "").trim() || "",
      developer: $('.app-details .row div:contains("Developer")').text().replace("Developer", "").trim() || "",
      categories: $('.app-details .row div:contains("Categories") a').map((_, el) => $(el).text().trim()).get().join(", ") || "",
      platforms: $('.app-details .row div:contains("Platforms") a').text().trim() || "",
      fileSize: $('.app-details .row div:contains("File Size")').text().replace("File Size", "").trim() || "",
      downloads: $('.app-details .row div:contains("Downloads")').text().replace("Downloads", "").trim() || "",
      license: $('.app-details .row div:contains("License")').text().replace("License", "").trim() || "",
      packageName: $('.app-details .row div:contains("Package Name")').text().replace("Package Name", "").trim() || "",
      redirectLink: $('.app-details a[href*="/redirect/"]').attr("href") || "",
      downloadLink: playStoreId ? `https://d.apkpure.com/b/APK/${playStoreId}?version=latest` : "",
      playStoreLink: playStoreLink,
      playStoreId: playStoreId
    };
  }
  getHeaders() {
    return {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=0, i",
      referer: this.baseUrl,
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      cookie: this.cookies
    };
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const scraper = new Apk4AllScraper();
  try {
    if (action === "search") {
      if (!query) {
        return res.status(400).json({
          message: "Query is required"
        });
      }
      const results = await scraper.search(query);
      return res.status(200).json(results);
    } else if (action === "detail") {
      if (!url) {
        return res.status(400).json({
          message: "URL is required"
        });
      }
      const apkDetails = await scraper.detail(url);
      return res.status(200).json(apkDetails);
    } else {
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