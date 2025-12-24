import axios from "axios";
import * as cheerio from "cheerio";
const BASE_URL = "https://kiryuu01.com/";
const extractType = classAttr => classAttr ? classAttr.replace(/type/gi, "").trim() : "Tidak Diketahui";
class MangaService {
  async Latest() {
    try {
      const {
        data
      } = await axios.get(BASE_URL);
      const $ = cheerio.load(data);
      return $(".listupd .bs").map((_, element) => ({
        title: $(element).find(".bsx a").attr("title") || "Tidak Diketahui",
        comicUrl: $(element).find(".bsx a").attr("href") || "#",
        chapterText: $(element).find(".bigor .adds .epxs").text().trim() || "Tidak Ada Info",
        thumbnail: $(element).find(".limit img").attr("src") || "Tidak Ada Gambar",
        type: extractType($(element).find(".limit .type").attr("class"))
      })).get();
    } catch (error) {
      throw new Error(`Error fetching latest comics: ${error.message}`);
    }
  }
  async Detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const getDetail = key => $("table.infotable tr").map((_, el) => $(el).find("td").first().text().trim().toLowerCase() === key.toLowerCase() ? $(el).find("td").eq(1).text().trim() : "").get().shift() || "Tidak Ada Info";
      return {
        title: $(".seriestuheader .entry-title").text().trim() || "Tidak Diketahui",
        altTitle: $(".seriestualt").text().trim() || "",
        thumbnail: $(".seriestucontl .thumb img").attr("src") || "Tidak Ada Gambar",
        rating: $(".seriestucontl .rating .num").text().trim() || "Tidak Ada Rating",
        synopsis: $(".seriestuhead .entry-content.entry-content-single p").text().trim() || "Tidak Ada Sinopsis",
        latestChapter: $(".lastend .inepcx").map((_, el) => $(el).find("span").first().text().trim().toLowerCase().includes("terbaru") ? $(el).find(".epcur").text().trim() : "").get().shift() || "Tidak Ada Info",
        status: getDetail("Status"),
        type: getDetail("Type"),
        released: getDetail("Released"),
        author: getDetail("Author"),
        artist: getDetail("Artist"),
        serialization: getDetail("Serialization"),
        postedBy: getDetail("Posted By"),
        postedOn: getDetail("Posted On"),
        updatedOn: getDetail("Updated On"),
        views: getDetail("Views"),
        genres: $('span:contains("Genres") a').map((_, el) => $(el).text().trim()).get(),
        chapters: await Promise.all($("#chapterlist ul.clstyle li").map(async (_, li) => ({
          chapNum: $(li).find(".eph-num .chapternum").text().trim() || "Chapter ?",
          chapDate: $(li).find(".eph-num .chapterdate").text().trim() || "",
          chapterUrl: $(li).find(".eph-num a").attr("href") || "#",
          downloadUrl: $(li).find(".dt a.dload").attr("href") || "#"
        })).get())
      };
    } catch (error) {
      throw new Error(`Error fetching manga detail: ${error.message}`);
    }
  }
  async Search(query) {
    try {
      const {
        data
      } = await axios.get(`${BASE_URL}?s=${encodeURIComponent(query)}`);
      const $ = cheerio.load(data);
      return $(".listupd .bs").map((_, element) => ({
        title: $(element).find(".bsx a").attr("title") || "Tidak Diketahui",
        link: $(element).find(".bsx a").attr("href") || "#",
        chapter: $(element).find(".bigor .adds .epxs").text().trim() || "Tidak Ada Info",
        thumbnail: $(element).find(".limit img").attr("src") || "Tidak Ada Gambar",
        type: extractType($(element).find(".limit .type").attr("class"))
      })).get();
    } catch (error) {
      throw new Error(`Error fetching search results: ${error.message}`);
    }
  }
  async Popular() {
    try {
      const {
        data
      } = await axios.get(BASE_URL);
      const $ = cheerio.load(data);
      return $(".listupd.popularslider .bs").map((_, element) => ({
        title: $(element).find(".bsx a").attr("title") || "Tidak Diketahui",
        link: $(element).find(".bsx a").attr("href") || "#",
        chapter: $(element).find(".bigor .adds .epxs").text().trim() || "Tidak Ada Info",
        thumbnail: $(element).find(".limit img").attr("src") || "Tidak Ada Gambar",
        type: extractType($(element).find(".limit .type").attr("class"))
      })).get();
    } catch (error) {
      throw new Error(`Error fetching popular manga: ${error.message}`);
    }
  }
  async downloadFile(url) {
    try {
      let res = await axios.get(url, {
        responseType: "arraybuffer",
        validateStatus: status => status < 400
      });
      if (res.headers["content-type"]?.includes("text/html")) {
        const match = res.data.toString().match(/window\.location\.replace\(['"](.+?)['"]\)/);
        if (match?.[1]) res = await axios.get(`https://dl.kiryuu.co${match[1]}`, {
          responseType: "arraybuffer",
          validateStatus: status => status < 400
        });
      }
      const fileName = res.headers["content-disposition"]?.match(/filename="?(.+?)"?$/)?.[1] || "downloaded_file.zip";
      return {
        buffer: res.data,
        fileName: fileName,
        mimetype: res.headers["content-type"] || "application/zip"
      };
    } catch (err) {
      throw new Error(`Gagal mengunduh file: ${err.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    url,
    query
  } = req.method === "GET" ? req.query : req.body;
  const mangaService = new MangaService();
  try {
    switch (action) {
      case "latest":
        return res.status(200).json(await mangaService.Latest());
      case "detail":
        if (url) {
          return res.status(200).json(await mangaService.Detail(url));
        } else {
          return res.status(400).json({
            error: 'Paramenter "url" is required for detail'
          });
        }
      case "search":
        if (query) {
          return res.status(200).json(await mangaService.Search(query));
        } else {
          return res.status(400).json({
            error: 'Paramenter "query" is required for search'
          });
        }
      case "popular":
        return res.status(200).json(await mangaService.Popular());
      case "download":
        if (url) {
          const file = await mangaService.downloadFile(url);
          const {
            buffer,
            fileName,
            mimetype
          } = file;
          res.setHeader("Content-Type", mimetype);
          res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
          return res.status(200).send(buffer);
        } else {
          return res.status(400).json({
            error: 'Paramenter "url" is required for download'
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action. Available actions: latest, detail, search, popular, download"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}