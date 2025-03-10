import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class SFileScraper {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }
  async search(query) {
    try {
      const url = `https://sfile.mobi/search.php?q=${encodeURIComponent(query)}&search=Search`;
      const {
        data
      } = await this.client.get(url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const results = [];
      $(".list").each((_, el) => {
        const link = $(el).find("a").attr("href");
        const name = $(el).find("a").text().trim();
        const size = $(el).text().match(/\(([^)]+)\)/)?.[1] || "Unknown";
        if (link) results.push({
          name: name,
          size: size,
          link: link
        });
      });
      return results;
    } catch (error) {
      throw new Error(`Gagal melakukan pencarian: ${error.message}`);
    }
  }
  async download(inputLink) {
    try {
      const {
        data
      } = await this.client.get(inputLink, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const cookies = await this.jar.getCookieString(inputLink);
      const filename = $("h1.intro").text().trim() || "unknown";
      const mimetype = $(".list").eq(0).text().split("- ")[1]?.trim() || "";
      const downloadPageLink = $("#download").attr("href");
      if (!downloadPageLink) throw new Error("Download URL tidak ditemukan");
      const {
        data: downloadPage
      } = await this.client.get(downloadPageLink, {
        headers: {
          ...this.headers,
          Cookie: cookies
        }
      });
      const $$ = cheerio.load(downloadPage);
      const finalUrl = $$("a.w3-button.w3-blue.w3-round#download").attr("href");
      const keyMatch = downloadPage.match(/&k='\+(.*?)';/);
      const key = keyMatch ? keyMatch[1].replace(/'/g, "") : "";
      const fullUrl = finalUrl ? `${finalUrl}${key ? `&k=${key}` : ""}` : null;
      const filesize = $$("body").text().match(/Download File \((.*?)\)/)?.[1];
      if (!fullUrl) throw new Error("Link unduhan tidak ditemukan");
      return {
        name: filename,
        type: mimetype,
        author: $(".list").eq(1).find("a").eq(0).text().trim(),
        date: $(".list").eq(2).text().trim().split("- Uploaded: ")[1],
        count: $(".list").eq(3).text().trim().split("- Downloads: ")[1],
        size: filesize || "Unknown",
        link: fullUrl
      };
    } catch (error) {
      throw new Error(`Gagal mengunduh file: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const scraper = new SFileScraper();
  try {
    let result;
    switch (action) {
      case "search":
        if (!query) throw new Error("Parameter 'query' wajib disertakan.");
        result = await scraper.search(query);
        break;
      case "download":
        if (!url) throw new Error("Parameter 'url' wajib disertakan.");
        result = await scraper.download(url);
        break;
      default:
        throw new Error("Parameter 'action' tidak valid.");
    }
    res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message
    });
  }
}