import axios from "axios";
import * as cheerio from "cheerio";
class BacaKomik {
  async search({
    query
  }) {
    try {
      const {
        data
      } = await axios.get(`https://bacakomik.one/?s=${encodeURIComponent(query)}`, {
        headers: {
          "user-agent": "Mozilla/5.0",
          "accept-language": "id-ID,id;q=0.9"
        }
      });
      const $ = cheerio.load(data);
      return $(".film-list .animepost").map((_, el) => {
        const e = $(el);
        return {
          title: e.find("h4").text().trim().replace(/\s+/g, " ") || "-",
          link: e.find("a").attr("href") || "",
          thumbnail: e.find("img").attr("data-lazy-src") || "",
          rating: e.find(".rating i").first().text().trim() || "N/A"
        };
      }).get();
    } catch (err) {
      console.error("Search error:", err.message);
      return [];
    }
  }
  async detail({
    url
  }) {
    try {
      const {
        data
      } = await axios.get(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10)",
          "accept-language": "id-ID,id;q=0.9"
        }
      });
      const $ = cheerio.load(data);
      const info = $(".infoanime");
      const title = info.find("h1.entry-title").text().trim() || "-";
      const description = info.find(".shortcsc").text().trim().replace(/\s+/g, " ") || "-";
      const thumbnail = info.find(".thumb img").attr("data-lazy-src")?.split("?")[0] || info.find(".thumb img").attr("src") || "";
      const rating = info.find('.ratingmanga i[itemprop="ratingValue"]').text().trim() || "0";
      const ratingCount = info.find('.ratingmanga meta[itemprop="ratingCount"]').attr("content") || "0";
      const detail = {};
      info.find(".spe span").each((_, el) => {
        const key = $(el).find("b").text().replace(":", "").toLowerCase().replace(/\s+/g, "_");
        const val = $(el).clone().children().remove().end().text().replace(/^[^:]*:\s*/, "").trim();
        if (key) detail[key] = val || "-";
      });
      const genres = info.find(".genre-info a").map((_, el) => $(el).text().trim()).get();
      const chapters = $(".eps_lst ul li").map((_, el) => {
        const a = $(el).find("span.lchx a");
        return {
          name: a.text().trim().replace(/\s+/g, " ") || "-",
          link: a.attr("href") || ""
        };
      }).get();
      const synopsis = $(".desc .entry-content.entry-content-single p").text().trim().replace(/\s+/g, " ");
      return {
        title: title,
        description: description,
        thumbnail: thumbnail,
        rating: rating,
        ratingCount: ratingCount,
        ...detail,
        genres: genres,
        chapters: chapters,
        synopsis: synopsis
      };
    } catch (err) {
      console.error("Detail error:", err.message);
      return {};
    }
  }
  async download({
    url
  }) {
    try {
      const {
        data
      } = await axios.get(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10)",
          "accept-language": "id-ID,id;q=0.9"
        }
      });
      const $ = cheerio.load(data);
      const images = $(".chapter-content img").map((_, el) => ({
        name: $(el).attr("alt") || "Untitled Image",
        url: $(el).attr("data-lazy-src") || $(el).attr("src") || ""
      })).get();
      const chapterInfo = {
        chapterTitle: $("div.chapter-area h1.entry-title").text().trim() || "No Chapter Title",
        chapterNumber: $("div.chapter-number").text().trim() || "N/A",
        nextChapterLink: $('.nextprev a[rel="next"]').attr("href") || "",
        prevChapterLink: $('.nextprev a[rel="prev"]').attr("href") || ""
      };
      const animeInfo = {
        animeTitle: $(".infoanime .infox h2").text().trim() || "No Anime Title",
        animeDescription: $(".infoanime .infox .shortcsc").text().trim() || "No Anime Description",
        animeImage: $(".infoanime .thumb img").attr("data-lazy-src") || $(".infoanime .thumb img").attr("src") || "",
        chapterLinks: $(".eps_lst ul li").map((_, el) => {
          const a = $(el).find("a");
          return {
            title: a.text().trim(),
            url: a.attr("href")
          };
        }).get()
      };
      return {
        title: $("h1.entry-title").text().trim() || "No Title",
        description: $(".chapter-desc").text().trim() || "No Description",
        images: images,
        chapterInfo: chapterInfo,
        embedUrl: $(".ytmVideoInfoVideoTitleContainer a").attr("href") || "",
        animeInfo: animeInfo
      };
    } catch (err) {
      console.error("Download error:", err.message);
      return {};
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const komik = new BacaKomik();
    let data;
    switch (params.action) {
      case "search":
        data = await komik.search(params.query);
        break;
      case "detail":
        data = await komik.detail(params.url);
        break;
      case "download":
        data = await komik.download(params.url);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action parameter"
        });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}