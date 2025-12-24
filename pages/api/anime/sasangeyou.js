import axios from "axios";
import * as cheerio from "cheerio";
class SasangeyouScraper {
  async search(query) {
    const searchUrl = `https://sasangeyou.fun/?s=${encodeURIComponent(query)}`;
    try {
      const {
        data
      } = await axios.get(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
        }
      });
      const $ = cheerio.load(data);
      const searchResults = [];
      $(".bsx").each((_, element) => {
        const title = $(element).find(".tt").text().trim();
        const link = $(element).find("a").attr("href");
        const thumb = $(element).find("img").attr("src");
        searchResults.push({
          title: title,
          link: link,
          thumb: thumb
        });
      });
      return searchResults;
    } catch (error) {
      console.error("Error:", error.message);
      return [];
    }
  }
  async latest() {
    const url = "https://sasangeyou.fun/manga/?order=update";
    try {
      const {
        data
      } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
        }
      });
      const $ = cheerio.load(data);
      const mangaList = [];
      $(".bsx").each((_, element) => {
        const title = $(element).find(".tt").text().trim();
        const link = $(element).find("a").attr("href");
        const thumb = $(element).find("img").attr("src");
        mangaList.push({
          title: title,
          link: link,
          thumb: thumb
        });
      });
      return mangaList;
    } catch (error) {
      console.error("Error:", error.message);
      return [];
    }
  }
  async detail(link) {
    const url = link;
    try {
      const {
        data
      } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
        }
      });
      const $ = cheerio.load(data);
      const postViews = $(".post-views-count").text().trim();
      const chapters = {
        first: {
          title: $(".inepcx .epcurfirst").text().trim(),
          link: $(".inepcx:first-child a").attr("href")
        },
        latest: {
          title: $(".inepcx .epcurlast").text().trim(),
          link: $(".inepcx:last-child a").attr("href")
        }
      };
      const thumbnail = $(".thumb img").attr("src");
      const rating = {
        value: $(".rating .num").text().trim(),
        count: $('meta[itemprop="ratingCount"]').attr("content")
      };
      const infoTable = {};
      $(".infotable tbody tr").each((_, row) => {
        const key = $(row).find("td:first-child").text().trim();
        const value = $(row).find("td:last-child").text().trim();
        infoTable[key] = value;
      });
      const genres = $(".seriestugenre a").map((_, el) => $(el).text().trim()).get();
      const chapterList = [];
      $(".eplister li").each((_, el) => {
        chapterList.push({
          title: $(el).find(".chapternum").text().trim(),
          date: $(el).find(".chapterdate").text().trim(),
          link: $(el).find(".eph-num a").attr("href"),
          downloadLink: $(el).find(".dload").attr("href")
        });
      });
      return {
        postViews: postViews,
        chapters: chapters,
        thumbnail: thumbnail,
        rating: rating,
        infoTable: infoTable,
        genres: genres,
        chapterList: chapterList
      };
    } catch (error) {
      console.error("Error:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req;
  const scraper = new SasangeyouScraper();
  try {
    if (query.type === "search" && query.query) {
      const result = await scraper.search(query.query);
      return res.status(200).json(result);
    } else if (query.type === "detail" && query.url) {
      const result = await scraper.detail(query.url);
      return res.status(200).json(result);
    } else if (query.type === "latest") {
      const result = await scraper.latest();
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        error: "Invalid query type or missing parameters"
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}