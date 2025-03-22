import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${process.env.DOMAIN_URL}/api/tools/web/html/v1?url=`];
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
      } = await this.axiosInstance.get(proxyUrls + "https://www.azlyrics.com/geo.js");
      const start = data.indexOf('value"') + 9;
      const end = data.indexOf('");', start);
      return data.substring(start, end);
    } catch {
      throw new Error("Gagal ambil xCode.");
    }
  }
  async search(query) {
    if (!query) throw new Error("Query tidak boleh kosong.");
    try {
      const xCode = await this.fetchXCode();
      const {
        data
      } = await this.axiosInstance.get(proxyUrls + "https://search.azlyrics.com/search.php", {
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
        if (url && title && artist) results.push({
          title: title,
          artist: artist,
          url: url
        });
      });
      return results.length ? results : `Hasil "${query}" tidak ditemukan.`;
    } catch {
      throw new Error("Gagal mencari lagu.");
    }
  }
  async getLyric(url) {
    if (!url) throw new Error("URL tidak boleh kosong.");
    try {
      const {
        data
      } = await this.axiosInstance.get(proxyUrls + url);
      const $ = cheerio.load(data);
      const lyrics = $("div").filter((_, el) => !$(el).attr("class") && !$(el).attr("id")).map((_, el) => $(el).text().trim()).get().reduce((a, b) => b.length > a.length ? b : a, "");
      return lyrics || "Lirik tidak ditemukan.";
    } catch {
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
    if (url) {
      const lyrics = await azlyric.getLyric(url);
      return res.status(200).json({
        result: lyrics
      });
    }
    if (query) {
      const results = await azlyric.search(query);
      if (typeof results === "string") return res.status(404).json({
        result: results
      });
      if (search === "true") return res.status(200).json({
        result: results
      });
      const topResult = results[0];
      if (!topResult) return res.status(404).json({
        message: `No results found for query: ${query}`
      });
      const lyrics = await azlyric.getLyric(topResult.url);
      return res.status(200).json({
        result: lyrics
      });
    }
    res.status(400).json({
      error: "Query or URL parameter is required."
    });
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while processing your request."
    });
  }
}