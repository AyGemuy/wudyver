import axios from "axios";
import * as cheerio from "cheerio";
class MangaScraper {
  constructor(baseUrl = "https://manhwaclan.com") {
    this.baseUrl = baseUrl;
  }
  async fetchData(url) {
    try {
      const {
        data
      } = await axios.get(url);
      return cheerio.load(data);
    } catch (error) {
      throw new Error(`Error fetching data: ${error.message}`);
    }
  }
  async search(query) {
    const $ = await this.fetchData(`${this.baseUrl}/?s=${query}&post_type=wp-manga`);
    const mangaData = [];
    $(".tab-content-wrap .row.c-tabs-item__content").each((i, element) => {
      const title = $(element).find(".post-title h3 a").text();
      const url = $(element).find(".post-title h3 a").attr("href");
      const alternative = $(element).find(".post-content_item.mg_alternative .summary-content").text().trim();
      const genres = $(element).find(".post-content_item.mg_genres .summary-content a").map((i, el) => $(el).text()).get();
      const status = $(element).find(".post-content_item.mg_status .summary-content").text().trim();
      const latestChapterTitle = $(element).find(".meta-item.latest-chap .chapter a").text();
      const latestChapterUrl = $(element).find(".meta-item.latest-chap .chapter a").attr("href");
      const rating = parseFloat($(element).find(".post-total-rating .score").text().trim());
      const imageUrl = $(element).find(".tab-thumb img").attr("src");
      mangaData.push({
        title: title,
        url: url,
        alternative: alternative,
        genres: genres,
        status: status,
        latestChapter: {
          title: latestChapterTitle,
          url: latestChapterUrl
        },
        rating: rating,
        imageUrl: imageUrl
      });
    });
    return mangaData;
  }
  async getTrending() {
    try {
      const $ = await this.fetchData(`${this.baseUrl}/manga/page/1/?m_orderby=trending`);
      return this.extractManhwaData($);
    } catch (error) {
      console.error(`Error fetching trending manga: ${error.message}`);
      return [];
    }
  }
  async getLatest() {
    try {
      const $ = await this.fetchData(`${this.baseUrl}/manga/page/1/?m_orderby=latest`);
      return this.extractManhwaData($);
    } catch (error) {
      console.error(`Error fetching latest manga: ${error.message}`);
      return [];
    }
  }
  async getRating() {
    try {
      const $ = await this.fetchData(`${this.baseUrl}/manga/page/1/?m_orderby=rating`);
      return this.extractManhwaData($);
    } catch (error) {
      console.error(`Error fetching top-rated manga: ${error.message}`);
      return [];
    }
  }
  async getMostViews() {
    try {
      const $ = await this.fetchData(`${this.baseUrl}/manga/page/1/?m_orderby=views`);
      return this.extractManhwaData($);
    } catch (error) {
      console.error(`Error fetching most viewed manga: ${error.message}`);
      return [];
    }
  }
  async getAlphabet() {
    try {
      const $ = await this.fetchData(`${this.baseUrl}/manga/page/1/?m_orderby=alphabet`);
      return this.extractManhwaData($);
    } catch (error) {
      console.error(`Error fetching alphabetically ordered manga: ${error.message}`);
      return [];
    }
  }
  async getNew() {
    try {
      const $ = await this.fetchData(`${this.baseUrl}/manga/page/1/?m_orderby=new-manga`);
      return this.extractManhwaData($);
    } catch (error) {
      console.error(`Error fetching new manga: ${error.message}`);
      return [];
    }
  }
  async getGenre(genre) {
    try {
      const $ = await this.fetchData(`${this.baseUrl}/manga-genre/${genre}/page/1/`);
      return this.extractManhwaData($);
    } catch (error) {
      console.error(`Error fetching manga by genre: ${error.message}`);
      return [];
    }
  }
  async getDetails(url) {
    try {
      const $ = await this.fetchData(url);
      const title = $(".post-title h1").text().trim();
      const imageURL = $(".summary_image img").attr("src");
      const rating = parseFloat($(".post-total-rating .score").text().trim()) || "N/A";
      const rank = $('.post-content_item:contains("Rank") .summary-content').text().trim() || "N/A";
      const alternative = $('.post-content_item:contains("Alternative") .summary-content').text().trim() || "N/A";
      const status = $('.post-content_item:contains("Status") .summary-content').text().trim() || "N/A";
      const chapters = [];
      $(".wp-manga-chapter").each((_, element) => {
        const chapterTitle = $(element).find("a").text().trim();
        const chapterURL = $(element).find("a").attr("href");
        chapters.push({
          chapterTitle: chapterTitle,
          chapterURL: chapterURL
        });
      });
      return {
        title: title,
        imageURL: imageURL,
        rating: rating,
        rank: rank,
        alternative: alternative,
        status: status,
        chapters: chapters
      };
    } catch (error) {
      console.error(`Error fetching manga details: ${error.message}`);
      return null;
    }
  }
  extractManhwaData($) {
    const manhwaData = [];
    $(".page-item-detail").each((_, element) => {
      const title = $(element).find(".post-title h3 a").text().trim();
      const imageURL = $(element).find("a img").attr("src");
      const manhwaURL = $(element).find("a").attr("href");
      const newestChapter = $(element).find(".list-chapter .chapter-item:first-child .chapter a").text().trim();
      const newestChapterURL = $(element).find(".list-chapter .chapter-item:first-child .chapter a").attr("href");
      manhwaData.push({
        title: title,
        imageURL: imageURL,
        manhwaURL: manhwaURL,
        newestChapter: newestChapter,
        newestChapterURL: newestChapterURL
      });
    });
    return manhwaData;
  }
}
export default async function handler(req, res) {
  const {
    action,
    genre,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    const scraper = new MangaScraper();
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: 'Query parameter "query" is required.'
          });
        }
        result = await scraper.search(query);
        break;
      case "trending":
        result = await scraper.getTrending();
        break;
      case "latest":
        result = await scraper.getLatest();
        break;
      case "rating":
        result = await scraper.getRating();
        break;
      case "mostViews":
        result = await scraper.getMostViews();
        break;
      case "alphabet":
        result = await scraper.getAlphabet();
        break;
      case "new":
        result = await scraper.getNew();
        break;
      case "genre":
        if (!genre) {
          return res.status(400).json({
            error: 'Query parameter "genre" is required.'
          });
        }
        result = await scraper.getGenre(genre);
        break;
      case "details":
        if (!url) {
          return res.status(400).json({
            error: 'Query parameter "url" is required.'
          });
        }
        result = await scraper.getDetails(url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action."
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}