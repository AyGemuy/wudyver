import axios from "axios";
import * as cheerio from "cheerio";
class Komiku {
  constructor() {
    this.host = "https://komiku.org";
    this.apiHost = "https://api.komiku.org";
    this.source = "komiku";
  }
  async home({
    page = 1
  } = {}) {
    try {
      console.log(`Fetching home page: ${page}`);
      const {
        data
      } = await axios.get(`${this.apiHost}/manga/page/${page}/?orderby=modified`, {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const mangas = [];
      $("div.bge").each((_, el) => {
        const $el = $(el);
        const mangaUrl = $el.find("div.bgei > a").attr("href") || "";
        const mangaID = mangaUrl.replace(this.host, "").replace("/manga/", "").replace(/\/$/, "") || "";
        const title = $el.find("div.kan > a > h3").text().trim() || "Untitled";
        const description = $el.find("div.kan > p").text().trim() || "No description";
        const genreText = $el.find("div.tpe1_inf").text().trim();
        const genres = genreText ? [genreText.split(" ").pop().trim()] : [""];
        let latestChapterId = "";
        let latestChapterNumber = 0;
        let latestChapterTitle = "";
        $el.find("div.new1").each((_, chapterEl) => {
          const $chapter = $(chapterEl);
          const chapterText = $chapter.find("span").first().text().trim();
          if (chapterText.includes("Terbaru")) {
            const chapterLink = $chapter.find("a").attr("href") || "";
            latestChapterId = chapterLink.replace(/\//g, "");
            latestChapterNumber = parseFloat($chapter.find("span").last().text().replace(/[^\d.]/g, "")) || 0;
            latestChapterTitle = $chapter.find("a").attr("title") || "";
          }
        });
        const coverImage = $el.find("div.bgei img").attr("src") || "";
        const readerInfo = $el.find("span.judul2").text().trim();
        mangas.push({
          id: mangaID,
          source: this.source,
          title: title,
          description: description,
          genres: genres,
          latestChapterId: latestChapterId,
          latestChapterNumber: latestChapterNumber,
          latestChapterTitle: latestChapterTitle,
          readerInfo: readerInfo,
          chapters: [],
          coverImages: [{
            index: 1,
            imageUrls: [coverImage]
          }]
        });
      });
      console.log(`Fetched ${mangas.length} mangas from home`);
      return mangas;
    } catch (err) {
      console.error("Error fetching home:", err.message);
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
      } = await axios.get(`${this.host}/manga/${id}`, {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const manga = {
        id: id,
        source: this.source,
        title: $("#Judul > p.j2").text().trim() || "Untitled",
        description: $("#Judul > p.desc").text().trim() || "Description unavailable",
        genres: [],
        status: "Ongoing",
        coverImages: [{
          index: 1,
          imageUrls: [$("#Informasi > div > img").attr("src") || ""]
        }],
        chapters: []
      };
      $("#Informasi > div > p").each((_, el) => {
        const text = $(el).text();
        if (text.includes("Genre")) {
          const genreLinks = $(el).find("a");
          genreLinks.each((_, genreEl) => {
            manga.genres.push($(genreEl).text().trim());
          });
        }
        if (text.includes("Status")) {
          manga.status = text.replace("Status", "").trim();
        }
      });
      $("#daftarChapter > tr").each((_, el) => {
        const chapterLink = $(el).find("td.judulseries > a").attr("href") || "";
        const chapterID = chapterLink.replace(/\//g, "");
        if (chapterLink) {
          manga.chapters.push({
            id: chapterID,
            source: this.source,
            title: $(el).find("td.judulseries > a").text().trim() || "",
            number: parseFloat(chapterLink.match(/\d+(\.\d+)?/)?.[0] || "0")
          });
        }
      });
      console.log(`Fetched detail for manga: ${manga.title}`);
      manga.latestChapterId = manga.chapters[0]?.id || "";
      manga.latestChapterNumber = manga.chapters[0]?.number || 0;
      manga.latestChapterTitle = manga.chapters[0]?.title || "";
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
        coverImages: [{
          imageUrls: []
        }],
        chapters: []
      };
    }
  }
  async search({
    query = ""
  } = {}) {
    try {
      console.log(`Searching manga: ${query}`);
      const q = query.replace(/\s+/g, "+");
      const {
        data
      } = await axios.get(`${this.apiHost}/?post_type=manga&s=${q}`, {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const mangas = [];
      $("div.bge").each((_, el) => {
        const $el = $(el);
        const mangaUrl = $el.find("div.bgei > a").attr("href") || "";
        const mangaID = mangaUrl.replace(this.host, "").replace("/manga/", "").replace(/\/$/, "") || "";
        const title = $el.find("div.kan > a > h3").text().trim() || "Untitled";
        const description = $el.find("div.kan > p").text().trim() || "No description";
        const genreText = $el.find("div.tpe1_inf").text().trim();
        const genres = genreText ? [genreText.split(" ").pop().trim()] : [""];
        let latestChapterId = "";
        let latestChapterNumber = 0;
        let latestChapterTitle = "";
        $el.find("div.new1").each((_, chapterEl) => {
          const $chapter = $(chapterEl);
          const chapterText = $chapter.find("span").first().text().trim();
          if (chapterText.includes("Terbaru")) {
            const chapterLink = $chapter.find("a").attr("href") || "";
            latestChapterId = chapterLink.replace(/\//g, "");
            latestChapterNumber = parseFloat($chapter.find("span").last().text().replace(/[^\d.]/g, "")) || 0;
            latestChapterTitle = $chapter.find("a").attr("title") || "";
          }
        });
        const coverImage = $el.find("div.bgei img").attr("src") || "";
        const updateInfo = $el.find("div.kan > p").text().trim();
        mangas.push({
          id: mangaID,
          source: this.source,
          title: title,
          description: description,
          genres: genres,
          latestChapterId: latestChapterId,
          latestChapterNumber: latestChapterNumber,
          latestChapterTitle: latestChapterTitle,
          updateInfo: updateInfo,
          chapters: [],
          coverImages: [{
            index: 1,
            imageUrls: [coverImage]
          }]
        });
      });
      console.log(`Found ${mangas.length} mangas for search: ${query}`);
      return mangas;
    } catch (err) {
      console.error("Error searching manga:", err.message);
      return [];
    }
  }
  async chapter({
    id = ""
  } = {}) {
    try {
      console.log(`Fetching chapter: ${id}`);
      const targetLink = `${this.host}/${id}`;
      const {
        data
      } = await axios.get(targetLink, {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const chapterNumber = parseFloat(id.split("chapter-").pop() || "0") || 0;
      const chapter = {
        id: id,
        source: this.source,
        sourceLink: targetLink,
        number: chapterNumber,
        chapterImages: []
      };
      $("#Baca_Komik img").each((index, el) => {
        const src = $(el).attr("src") || "";
        const chapterImage = {
          index: index,
          imageUrls: [src]
        };
        const altImage = this.errImg($(el).attr("onerror") || "");
        if (altImage) chapterImage.imageUrls.push(altImage);
        chapter.chapterImages.push(chapterImage);
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
        chapterImages: []
      };
    }
  }
  errImg(str) {
    const match = str.match(/this\.src='([^']+)'/i);
    return match?.[1] || "";
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new Komiku();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Paramenter 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "chapter":
        if (!params.id) {
          return res.status(400).json({
            error: "Paramenter 'id' wajib diisi untuk action 'chapter'."
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