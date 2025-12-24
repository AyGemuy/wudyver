import axios from "axios";
import * as cheerio from "cheerio";
class Harimanga {
  async latest() {
    const {
      data
    } = await axios.get("https://harimanga.me/");
    const $ = cheerio.load(data);
    const results = [];
    let count = 0;
    $(".page-listing-item").each((i, el) => {
      if (count >= 10) return false;
      const title = $(el).find(".post-title h3 a").text().trim();
      const link = $(el).find(".post-title h3 a").attr("href");
      const latestChapter = $(el).find(".list-chapter .chapter-item .chapter a").first().text().trim();
      const chapterLink = $(el).find(".list-chapter .chapter-item .chapter a").first().attr("href");
      results.push({
        title: title,
        link: link,
        latestChapter: latestChapter,
        chapterLink: chapterLink
      });
      count++;
    });
    return results;
  }
  async search(query) {
    const url = `https://harimanga.me/?s=${encodeURIComponent(query)}&post_type=wp-manga`;
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const results = [];
    $(".c-tabs-item__content").each((_, el) => {
      const title = $(el).find(".post-title a").text().trim();
      const link = $(el).find(".post-title a").attr("href");
      const img = $(el).find(".tab-thumb img").attr("src");
      const genres = $(el).find(".mg_genres .summary-content a").map((_, g) => $(g).text().trim()).get();
      const status = $(el).find(".mg_status .summary-content").text().trim();
      const latestChapter = $(el).find(".latest-chap .chapter a").text().trim();
      const chapterLink = $(el).find(".latest-chap .chapter a").attr("href");
      const rating = $(el).find(".rating .score").text().trim();
      results.push({
        title: title,
        link: link,
        img: img,
        genres: genres,
        status: status,
        latestChapter: latestChapter,
        chapterLink: chapterLink,
        rating: rating
      });
    });
    return results;
  }
  async detail(url) {
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const title = $(".post-title h1").text().trim();
    const image = $(".summary_image img").attr("src");
    const rating = $(".post-total-rating .score").first().text().trim();
    const rank = $('.post-content_item:contains("Rank") .summary-content').text().trim();
    const status = $('.post-content_item:contains("Status") .summary-content').text().trim();
    const genres = $('.post-content_item:contains("Genre(s)") .genres-content a').map((_, el) => $(el).text().trim()).get();
    return {
      title: title,
      image: image,
      rating: rating,
      rank: rank,
      status: status,
      genres: genres
    };
  }
  async chapters(url) {
    const {
      data
    } = await axios.get(url);
    const $ = cheerio.load(data);
    const title = $(".post-title h1").text().trim();
    const chapters = $(".wp-manga-chapter").map((_, el) => {
      const chapterTitle = $(el).find("a").first().text().trim();
      const link = $(el).find("a").first().attr("href");
      const releaseDate = $(el).find(".chapter-release-date i").text().trim() || "Unknown";
      return `title: ${chapterTitle},\nlink: ${link},\ntanggal rilis: ${releaseDate}`;
    }).get();
    return `${title}\n\n${chapters.join("\n")}`;
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  const harimanga = new Harimanga();
  try {
    switch (action) {
      case "latest":
        const latestResults = await harimanga.latest();
        return res.status(200).json({
          success: true,
          data: latestResults
        });
      case "search":
        if (!query) throw new Error("Paramenter 'query' diperlukan untuk pencarian.");
        const searchResults = await harimanga.search(query);
        return res.status(200).json({
          success: true,
          data: searchResults
        });
      case "detail":
        if (!url) throw new Error("Paramenter 'url' diperlukan untuk melihat detail.");
        const detailResults = await harimanga.detail(url);
        return res.status(200).json({
          success: true,
          data: detailResults
        });
      case "chapters":
        if (!url) throw new Error("Paramenter 'url' diperlukan untuk melihat daftar chapter.");
        const chaptersResults = await harimanga.chapters(url);
        return res.status(200).json({
          success: true,
          data: chaptersResults
        });
      default:
        throw new Error("Aksi tidak dikenali. Gunakan 'latest', 'search', 'detail', atau 'chapters'.");
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}