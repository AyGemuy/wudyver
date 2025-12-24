import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const DOMAIN_URL = apiConfig.DOMAIN_URL;
const proxyUrls = [`https://${DOMAIN_URL}/api/tools/web/html/v1?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class Azlyric {
  constructor() {
    this.axiosInstance = axios.create({
      headers: {
        "User-Agent": "Postify/1.0.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
      }
    });
  }
  async fetchXCode() {
    try {
      const {
        data
      } = await this.axiosInstance.get(`${randomProxyUrl}https://www.azlyrics.com/geo.js`);
      const start = data.indexOf('value"') + 9;
      const end = data.indexOf('");', start);
      return data.substring(start, end);
    } catch (error) {
      console.error("Gagal mengambil xCode:", error);
      throw new Error("Gagal mengambil xCode.");
    }
  }
  async search(query) {
    if (!query) {
      throw new Error("Query tidak boleh kosong.");
    }
    try {
      const xCode = await this.fetchXCode();
      const {
        data
      } = await this.axiosInstance.get(`${randomProxyUrl}https://search.azlyrics.com/search.php`, {
        params: {
          q: query,
          x: xCode
        }
      });
      const $ = cheerio.load(data);
      const results = [];
      $("td").each((_, el) => {
        const $el = $(el);
        const url = $el.find("a[href]").attr("href")?.trim();
        const title = $el.find("span").text().trim();
        const artist = $el.find("span").next("b").text().trim();
        if (url && title && artist) {
          results.push({
            title: title,
            artist: artist,
            url: url
          });
        }
      });
      return results.length ? results : {
        message: `Hasil "${query}" tidak ditemukan.`
      };
    } catch (error) {
      console.error("Gagal mencari lagu:", error);
      throw new Error("Gagal mencari lagu.");
    }
  }
  async getLyric(url) {
    if (!url) {
      throw new Error("URL tidak boleh kosong.");
    }
    try {
      const {
        data
      } = await this.axiosInstance.get(`${randomProxyUrl}${url}`);
      const $ = cheerio.load(data);
      const lyrics = $("div").filter((_, el) => !$(el).attr("class") && !$(el).attr("id")).map((_, el) => $(el).text().trim()).get().reduce((a, b) => b.length > a.length ? b : a, "");
      return lyrics || {
        message: "Lirik tidak ditemukan."
      };
    } catch (error) {
      console.error("Gagal mengambil lirik dari URL:", url, error);
      throw new Error("Gagal mengambil lirik.");
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      query,
      url,
      search
    } = req.method === "GET" ? req.query : req.body;
    const azlyric = new Azlyric();
    let action;
    if (url) action = "url";
    else if (query) action = "query";
    switch (action) {
      case "url":
        const lyricsResult = await azlyric.getLyric(url);
        return res.status(200).json({
          result: lyricsResult
        });
      case "query":
        const searchResults = await azlyric.search(query);
        if (typeof searchResults === "string" || searchResults && searchResults.message) {
          return res.status(404).json({
            result: searchResults
          });
        }
        if (search === "true") {
          return res.status(200).json({
            result: searchResults
          });
        }
        const topResult = searchResults[0];
        if (!topResult) {
          return res.status(404).json({
            message: `Tidak ada hasil ditemukan untuk kueri: ${query}`
          });
        }
        const queryLyricsResult = await azlyric.getLyric(topResult.url);
        return res.status(200).json({
          result: queryLyricsResult
        });
      default:
        return res.status(400).json({
          error: "Paramenter 'query' atau 'url' diperlukan."
        });
    }
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan Anda."
    });
  }
}