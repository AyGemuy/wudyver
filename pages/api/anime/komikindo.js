import fetch from "node-fetch";
import * as cheerio from "cheerio";
class Komikindo {
  constructor(baseUrl = "https://komikindo.wtf/?s=") {
    this.baseUrl = baseUrl;
  }
  async search(query) {
    try {
      const response = await fetch(`${this.baseUrl}${encodeURIComponent(query)}`);
      const html = await response.text();
      const $ = cheerio.load(html);
      const results = $(".postbody .film-list .animepost").get().map(el => {
        const $el = $(el);
        const title = $el.find(".bigors .tt h4").text().trim();
        const href = $el.find(".animposx a").attr("href");
        const image = $el.find(".animposx a .limit img").attr("src");
        const type = $el.find(".limit .typeflag").text().trim();
        const ratingStyle = $el.find(".adds .rating .archiveanime-rating-bar span").attr("style");
        const ratingMatch = ratingStyle?.match(/width:(\d+)%/);
        const rating = ratingMatch ? `${ratingMatch[1]}%` : "0%";
        return {
          title: title,
          href: href,
          image: image,
          rating: rating,
          type: type || "Unknown"
        };
      });
      return results.filter(em => em.title && em.href);
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return [];
    }
  }
  async detail(url) {
    try {
      const res = await fetch(url);
      const body = await res.text();
      const $ = cheerio.load(body);
      const mangaData = {
        title: $("h1.entry-title").text().trim(),
        altTitle: $('div.spe span:contains("Judul Alternatif:")').text().replace("Judul Alternatif:", "").trim() || "N/A",
        status: $('div.spe span:contains("Status:")').text().replace("Status:", "").trim() || "N/A",
        author: $('div.spe span:contains("Pengarang:")').text().replace("Pengarang:", "").trim() || "N/A",
        illustrator: $('div.spe span:contains("Ilustrator:")').text().replace("Ilustrator:", "").trim() || "N/A",
        genre: $(".genre-info a").map((i, el) => $(el).text().trim()).get() || ["N/A"],
        theme: $('div.spe span:contains("Tema:") a').map((i, el) => $(el).text().trim()).get() || ["N/A"],
        type: $('div.spe span:contains("Jenis Komik:") a').text().trim() || "N/A",
        rating: $('div.archiveanime-rating i[itemprop="ratingValue"]').text().trim() || "N/A",
        ratingCount: $("div.votescount").text().trim() || "0",
        imageUrl: $("div.thumb img").attr("src") || "",
        description: $("div#sinopsis div.entry-content.entry-content-single").text().trim() || "No description available.",
        latestChapter: $("div.epsbr span.barunew").first().text().trim() || "N/A",
        firstChapterLink: $("div.epsbr.chapter-awal a").attr("href") || "#",
        lastChapterLink: $("div.epsbr a").last().attr("href") || "#"
      };
      const spoilerImages = $("#spoiler .spoiler-img img").map((i, el) => ({
        imageUrl: $(el).attr("src"),
        altText: $(el).attr("alt") || "No Alt Text"
      })).get();
      const relatedPosts = $("#mirip .widget-post .serieslist ul li").map((i, el) => ({
        title: $(el).find(".leftseries h4 a").text().trim() || "No Title",
        link: $(el).find(".leftseries h4 a").attr("href") || "#",
        imageUrl: $(el).find(".imgseries img").attr("src") || "",
        description: $(el).find(".excerptmirip").text().trim() || "No Description"
      })).get();
      const chapters = $("#chapter_list ul li").map((i, el) => ({
        chapterNumber: $(el).find(".lchx a").text().trim().replace("Chapter", "").trim() || "N/A",
        chapterUrl: $(el).find(".lchx a").attr("href") || "#",
        timeAgo: $(el).find(".dt a").text().trim() || "N/A"
      })).get();
      return {
        mangaData: mangaData,
        spoilerImages: spoilerImages,
        relatedPosts: relatedPosts,
        chapters: chapters
      };
    } catch (err) {
      console.error("Error fetching or parsing the page:", err);
    }
  }
  async download(url) {
    try {
      const res = await fetch(url);
      const body = await res.text();
      const $ = cheerio.load(body);
      return {
        title: $("h1.entry-title").text().trim() || "No Title",
        chapterDescription: $(".chapter-desc").text().trim() || "No Description",
        prevChapterLink: $('a[rel="prev"]').attr("href") ? $('a[rel="prev"]').attr("href") : null,
        nextChapterLink: $('a[rel="next"]').attr("href") ? $('a[rel="next"]').attr("href") : null,
        chapterImages: $(".chapter-image img").map((_, el) => $(el).attr("src") || "").get()
      };
    } catch (err) {
      console.error("Error fetching or parsing the page:", err);
    }
  }
}
export default async function handler(req, res) {
  const {
    method,
    query
  } = req;
  const komikindo = new Komikindo();
  if (method === "GET") {
    try {
      const {
        action,
        searchQuery,
        url
      } = query;
      if (action === "search" && searchQuery) {
        const results = await Komikindo.search(searchQuery);
        return res.status(200).json(results);
      }
      if (action === "detail" && url) {
        const details = await Komikindo.detail(url);
        return res.status(200).json(details);
      }
      if (action === "download" && url) {
        const download = await Komikindo.download(url);
        return res.status(200).json(download);
      }
      return res.status(400).json({
        message: "Invalid action or parameters"
      });
    } catch (error) {
      console.error("Error handling request:", error);
      return res.status(500).json({
        message: "Internal Server Error"
      });
    }
  } else {
    return res.status(405).json({
      message: "Method Not Allowed"
    });
  }
}