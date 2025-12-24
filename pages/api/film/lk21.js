import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class LK21 {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  async fetchData(url) {
    try {
      const response = await axios.get(randomProxyUrl + url);
      if (response.status === 200 && typeof response.data === "string") {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error.message);
      return null;
    }
  }
  async searchData(query = "") {
    return await this.fetchData(`${this.baseUrl}?s=${encodeURIComponent(query)}`);
  }
  async search(query = "Hulk") {
    const html = await this.searchData(query);
    if (!html) {
      return [{
        message: "Tidak ada hasil yang ditemukan atau gagal memuat halaman."
      }];
    }
    const $ = cheerio.load(html);
    const results = [];
    $(".search-item").each((_, el) => {
      const title = $(el).find(".search-content h3 a").text().trim();
      const link = $(el).find(".search-content h3 a").attr("href")?.trim();
      const director = $(el).find(".search-content p:contains('Sutradara')").text().replace("Sutradara:", "").trim();
      const stars = $(el).find(".search-content p:contains('Bintang')").text().replace("Bintang:", "").trim();
      const image = $(el).find(".search-poster a img").attr("src")?.trim();
      results.push({
        title: title,
        link: link,
        director: director,
        stars: stars,
        image: image
      });
    });
    return results.length ? results : [{
      message: "Tidak ada hasil yang ditemukan untuk pencarian ini."
    }];
  }
  async download(url) {
    const html = await this.fetchData(url);
    if (!html) {
      return {
        video: "Failed to retrieve video source.",
        providers: ["Failed to retrieve providers."]
      };
    }
    const $ = cheerio.load(html);
    const video = $("#player video").attr("src") || "No video source found.";
    const providers = $("#loadProviders a").map((_, el) => ({
      name: $(el).text().trim(),
      link: decodeURIComponent($(el).attr("href")?.replace("https://playeriframe.lol/iframe.php?url=", "") || "#"),
      alt: $(el).attr("class") || "N/A"
    })).get();
    return {
      video: video,
      download: providers.length ? providers : ["No providers found."]
    };
  }
  async detail(url) {
    const html = await this.fetchData(url);
    if (!html) {
      return {
        message: "Failed to retrieve movie details."
      };
    }
    const $ = cheerio.load(html);
    const title = $(".post-header h2").eq(0).text().trim() || "No title";
    const poster = $(".content-wrapper .content-poster img").attr("src") || "No poster";
    const quality = $(".content-wrapper h2").eq(0).next().text().trim() || "N/A";
    const country = $(".content-wrapper h2").eq(1).next().text().trim() || "N/A";
    const stars = $(".content-wrapper h2").eq(2).next().find("a").map((_, el) => $(el).text().trim()).get() || ["N/A"];
    const director = $(".content-wrapper h2").eq(3).next().find("a").text().trim() || "N/A";
    const genres = $(".content-wrapper h2").eq(4).next().find("a").map((_, el) => $(el).text().trim()).get() || ["N/A"];
    const imdb = $(".content-wrapper h2").eq(5).next().text().trim() || "N/A";
    const releaseDate = $(".content-wrapper h2").eq(6).next().text().trim() || "N/A";
    const duration = $(".content-wrapper h2").eq(10).next().text().trim() || "N/A";
    const synopsis = $("blockquote").eq(0).text().trim() || "No synopsis";
    const downloadInfo = await this.download(url);
    return {
      title: title,
      poster: poster,
      quality: quality,
      country: country,
      stars: stars,
      director: director,
      genres: genres,
      imdb: imdb,
      releaseDate: releaseDate,
      duration: duration,
      synopsis: synopsis,
      video: downloadInfo?.video || "N/A",
      download: downloadInfo?.download || []
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const scraper = new LK21("https://tv4.lk21official.life/search.php");
  try {
    let result;
    switch (action) {
      case "search":
        result = await scraper.search(query || "Hulk");
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for details"
        });
        result = await scraper.detail(url);
        break;
      case "download":
        if (!url) return res.status(400).json({
          error: "URL is required for download"
        });
        result = await scraper.download(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "An error occurred",
      details: error.message
    });
  }
}