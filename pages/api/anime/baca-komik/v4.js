import axios from "axios";
import * as cheerio from "cheerio";
class ZonaKomik {
  constructor() {
    this.source = "zonakomik";
    this.host = "https://zonakomik.web.id";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async home() {
    try {
      console.log("Fetching home page from ZonaKomik...");
      const {
        data
      } = await axios.get(this.host, {
        headers: this.headers,
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const mangas = [];
      $("div.bsx").each((_, el) => {
        const $el = $(el);
        const link = $el.find("a").attr("href") || "";
        const idMatch = link.match(/id=(\d+)/);
        const mangaID = idMatch ? idMatch[1] : "";
        const title = $el.find("div.tt").text().trim() || "Untitled";
        const coverImage = $el.find("img").attr("src") || "";
        const chapterText = $el.find("div.epxs").text().trim();
        const chapterMatch = chapterText.match(/Chapter\s+([\d.]+)/i);
        const latestChapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : 0;
        const type = $el.find("span.type").text().trim() || "";
        if (mangaID) {
          mangas.push({
            id: mangaID,
            source: this.source,
            title: title,
            type: type,
            latestChapterNumber: latestChapterNumber,
            latestChapterTitle: chapterText,
            coverImages: [{
              index: 1,
              imageUrls: [coverImage]
            }],
            chapters: []
          });
        }
      });
      console.log(`Fetched ${mangas.length} mangas from home`);
      return mangas;
    } catch (err) {
      console.error("Error fetching home:", err.message);
      return [];
    }
  }
  async search({
    query = ""
  } = {}) {
    try {
      console.log(`Searching manga: ${query}`);
      const {
        data
      } = await axios.get(`${this.host}/?search=${encodeURIComponent(query)}`, {
        headers: {
          ...this.headers,
          referer: this.host,
          "sec-fetch-site": "same-origin"
        },
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const mangas = [];
      $("div.bsx").each((_, el) => {
        const $el = $(el);
        const link = $el.find("a").attr("href") || "";
        const idMatch = link.match(/id=(\d+)/);
        const mangaID = idMatch ? idMatch[1] : "";
        const title = $el.find("div.tt").text().trim() || "Untitled";
        const coverImage = $el.find("img").attr("src") || "";
        const chapterText = $el.find("div.epxs").text().trim();
        const chapterMatch = chapterText.match(/Chapter\s+([\d.]+)/i);
        const latestChapterNumber = chapterMatch ? parseFloat(chapterMatch[1]) : 0;
        const type = $el.find("span.type").text().trim() || "";
        if (mangaID) {
          mangas.push({
            id: mangaID,
            source: this.source,
            title: title,
            type: type,
            latestChapterNumber: latestChapterNumber,
            latestChapterTitle: chapterText,
            coverImages: [{
              index: 1,
              imageUrls: [coverImage]
            }],
            chapters: []
          });
        }
      });
      console.log(`Found ${mangas.length} mangas for search: ${query}`);
      return mangas;
    } catch (err) {
      console.error("Error searching manga:", err.message);
      return [];
    }
  }
  async detail({
    id = ""
  } = {}) {
    try {
      console.log(`Fetching manga detail: ${id}`);
      const {
        data
      } = await axios.get(`${this.host}/ebook-detail.php?id=${id}`, {
        headers: {
          ...this.headers,
          referer: this.host,
          "sec-fetch-site": "same-origin"
        },
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const manga = {
        id: id,
        source: this.source,
        title: $("h1.entry-title").text().trim() || "Untitled",
        description: $("div.entry-content p").first().text().trim() || "Description unavailable",
        genres: [],
        status: "Ongoing",
        type: "",
        coverImages: [{
          index: 1,
          imageUrls: [$("div.thumb img").attr("src") || ""]
        }],
        chapters: []
      };
      $("div.wd-full span.mgen a").each((_, el) => {
        const genre = $(el).text().trim();
        if (genre) manga.genres.push(genre);
      });
      manga.type = $("span.type").text().trim() || "";
      $("div.eph-num a").each((_, el) => {
        const $chapter = $(el);
        const chapterLink = $chapter.attr("href") || "";
        const chIdMatch = chapterLink.match(/id=(\d+)/);
        const chapterID = chIdMatch ? chIdMatch[1] : "";
        const chapterTitle = $chapter.find("span.chapternum").text().trim() || "";
        const chapterNumMatch = chapterTitle.match(/Chapter\s+([\d.]+)/i);
        const chapterNumber = chapterNumMatch ? parseFloat(chapterNumMatch[1]) : 0;
        if (chapterID) {
          manga.chapters.push({
            id: chapterID,
            source: this.source,
            title: chapterTitle,
            number: chapterNumber
          });
        }
      });
      manga.chapters.sort((a, b) => b.number - a.number);
      manga.latestChapterId = manga.chapters[0]?.id || "";
      manga.latestChapterNumber = manga.chapters[0]?.number || 0;
      manga.latestChapterTitle = manga.chapters[0]?.title || "";
      console.log(`Fetched detail for manga: ${manga.title}`);
      return manga;
    } catch (err) {
      console.error("Error fetching detail:", err.message);
      return {
        id: id,
        source: this.source,
        title: "Untitled",
        description: "Description unavailable",
        genres: [],
        status: "Ongoing",
        type: "",
        coverImages: [{
          imageUrls: []
        }],
        chapters: []
      };
    }
  }
  async chapter({
    id = ""
  } = {}) {
    try {
      console.log(`Fetching chapter: ${id}`);
      const targetLink = `${this.host}/read-story.php?id=${id}`;
      const {
        data
      } = await axios.get(targetLink, {
        headers: {
          ...this.headers,
          referer: this.host,
          "sec-fetch-site": "same-origin"
        },
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const chapter = {
        id: id,
        source: this.source,
        sourceLink: targetLink,
        number: 0,
        title: $("h1.entry-title").text().trim() || "",
        chapterImages: []
      };
      const chNumMatch = chapter.title.match(/Chapter\s+([\d.]+)/i);
      chapter.number = chNumMatch ? parseFloat(chNumMatch[1]) : 0;
      $("#readerarea img").each((index, el) => {
        const src = $(el).attr("src") || "";
        if (src) {
          chapter.chapterImages.push({
            index: index + 1,
            imageUrls: [src]
          });
        }
      });
      console.log(`Fetched ${chapter.chapterImages.length} images for chapter: ${id}`);
      return chapter;
    } catch (err) {
      console.error("Error fetching chapter:", err.message);
      return {
        id: id,
        source: this.source,
        sourceLink: "",
        number: 0,
        title: "",
        chapterImages: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new ZonaKomik();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "chapter":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'chapter'."
          });
        }
        response = await api.chapter(params);
        break;
      case "home":
        response = await api.home(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'home', 'search', 'detail', dan 'chapter'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}