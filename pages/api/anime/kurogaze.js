import axios from "axios";
import * as cheerio from "cheerio";
class KuroGraveAPI {
  constructor() {
    this.api = {
      base: "https://k.kurogaze.moe",
      endpoints: {
        search: (keyword, page = 1) => `/page/${page}/?s=${encodeURIComponent(keyword)}&post_type=post`,
        jadwal: () => "/jadwal-rilis/",
        homepage: () => "/"
      }
    };
    this.headers = {
      "user-agent": "Postify/1.0.0",
      accept: "text/html",
      referer: "https://k.kurogaze.moe/"
    };
  }
  async fetch(url) {
    console.log(`[API Proses] Mengambil data dari URL: ${url}`);
    const {
      data
    } = await axios.get(url, {
      headers: this.headers,
      timeout: 15e3
    });
    return cheerio.load(data);
  }
  async details(url) {
    console.log("[API Proses] Memulai pengambilan detail.");
    if (!url) {
      console.log("[API Proses] URL detail tidak diberikan.");
      return {
        success: false,
        code: 400,
        result: {
          error: "URL Kurogaze tidak diberikan."
        }
      };
    }
    try {
      const $ = await this.fetch(url);
      const title = $("h1").text().trim();
      const sinopsis = $(".sinopsis .content").text().trim();
      const info = {};
      $(".single-data table tr").each((em, el) => {
        const key = $(el).find("td").first().text().trim().toLowerCase();
        const val = $(el).find("td").last().text().trim();
        info[key] = val;
      });
      const trailer = $(".trailer iframe").attr("src") || null;
      const episodeList = $(".episode-data ul li").map((em, el) => $(el).text().trim()).get();
      const downloadLinks = [];
      $(".dlcontent .title-dl-anime").each((em, el) => {
        const episodeTitle = $(el).text().trim();
        const episodeNumber = episodeTitle.match(/Episode\s+(\d+)/i)?.[1] || null;
        $(el).next(".dl-content-for").find(".reso").each((eq, r) => {
          const resolution = $(r).find("strong").text().trim();
          const mirrors = $(r).find("a").map((eqq, a) => ({
            label: $(a).text().trim(),
            link: $(a).attr("href")
          })).get();
          if (resolution && mirrors.length) {
            downloadLinks.push({
              episode: episodeNumber,
              episodeTitle: episodeTitle,
              resolution: resolution,
              mirrors: mirrors
            });
          }
        });
      });
      downloadLinks.length || $(".content-batch ul li, .dl-content-for .reso").each((em, r) => {
        const resolution = $(r).find("strong").text().trim();
        const mirrors = $(r).find("a").map((eqq, a) => ({
          label: $(a).text().trim(),
          link: $(a).attr("href")
        })).get();
        if (resolution && mirrors.length) downloadLinks.push({
          resolution: resolution,
          mirrors: mirrors
        });
      });
      const inferredType = info.type || info.premiered || info.series ? "TV" : "Unknown";
      console.log("[API Proses] Detail berhasil diambil.");
      return {
        success: true,
        code: 200,
        result: {
          title: title,
          type: inferredType,
          synonym: info.synonym || "",
          sinopsis: sinopsis,
          premiered: info.premiered || "",
          status: info.status || "",
          score: info.score || "",
          duration: info.duration || "",
          studio: info.studios || "",
          epsTotal: info.episode || "",
          series: info.series || "",
          genre: info.genre || "",
          trailer: trailer,
          episodeList: episodeList,
          downloadLinks: downloadLinks
        }
      };
    } catch (err) {
      console.error(`[API Proses] Terjadi kesalahan saat mengambil detail: ${err.message}`);
      return {
        success: false,
        code: err?.response?.status || 500,
        result: {
          error: "Gagal mengambil detail data dari Kurogaze.",
          details: err.message
        }
      };
    }
  }
  async search(keyword = "", page = 1) {
    console.log(`[API Proses] Memulai pencarian dengan kata kunci '${keyword}' halaman ${page}.`);
    if (!keyword) {
      console.log("[API Proses] Kata kunci pencarian kosong.");
      return {
        success: false,
        code: 400,
        result: {
          error: "Kata kunci pencarian tidak boleh kosong."
        }
      };
    }
    try {
      const $ = await this.fetch(`${this.api.base}${this.api.endpoints.search(keyword, page)}`);
      const articles = $(".artikel-post article").toArray();
      if (!articles.length) {
        console.log(`[API Proses] Anime dengan kata kunci "${keyword}" tidak ditemukan.`);
        return {
          success: false,
          code: 404,
          result: {
            error: `Anime dengan kata kunci "${keyword}" tidak ditemukan.`
          }
        };
      }
      const results = await Promise.all(articles.map(async el => {
        const wrap = $(el);
        const title = wrap.find("h2.title a").text().trim();
        const link = wrap.find("h2.title a").attr("href");
        const image = wrap.find(".thumb img").attr("src");
        const postedBy = wrap.find('td:contains("Posted By") + td.author strong').text().trim();
        const type = wrap.find('td:contains("Type") + td a').text().trim();
        const genres = wrap.find('td:contains("Genres") + td a').map((em, a) => $(a).text().trim()).get();
        const season = wrap.find('td:contains("Premiered") + td a').text().trim();
        const status = wrap.find('td:contains("Status") + td a').text().trim();
        const score = wrap.find(".score").text().trim();
        const dateInfo = wrap.find(".date").text().trim();
        const detail = type || season || wrap.find('td:contains("Series")').length ? (await this.details(link)).result : null;
        return {
          title: title,
          link: link,
          image: image,
          postedBy: postedBy,
          type: type,
          genres: genres,
          season: season,
          status: status,
          score: score,
          dateInfo: dateInfo,
          detail: detail
        };
      }));
      const pageNumbers = $("ul.pagination li").map((em, el) => parseInt($(el).text().trim())).get().filter(Boolean);
      const totalPages = Math.max(...pageNumbers, page);
      const hasNextPage = $("ul.pagination li").filter((em, el) => $(el).text().trim() === "Next" && !$(el).hasClass("disabled")).length > 0;
      console.log("[API Proses] Pencarian berhasil.");
      return {
        success: true,
        code: 200,
        result: {
          keyword: keyword,
          page: page,
          totalResults: results.length,
          pagination: {
            currentPage: page,
            hasNextPage: hasNextPage,
            totalPages: totalPages
          },
          data: results
        }
      };
    } catch (err) {
      console.error(`[API Proses] Terjadi kesalahan saat melakukan pencarian: ${err.message}`);
      return {
        success: false,
        code: err?.response?.status || 500,
        result: {
          error: "Gagal melakukan pencarian data di Kurogaze.",
          details: err.message
        }
      };
    }
  }
  async schedule() {
    console.log("[API Proses] Memulai pengambilan jadwal rilis.");
    try {
      const $ = await this.fetch(`${this.api.base}${this.api.endpoints.jadwal()}`);
      const jadwal = {};
      $(".contnet-artikel h3").each((em, h) => {
        const hari = $(h).text().trim().toUpperCase();
        if (!["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].includes(hari)) return;
        const list = [];
        $(h).next("p").find("a").each((eq, a) => {
          const link = $(a).attr("href");
          const title = $(a).text().trim();
          const wr = $(a).parent().text().trim();
          const tm = wr.match(/\((.*?)\)/);
          const time = tm ? tm[1].replace(/–/g, "-") : null;
          list.push({
            title: title,
            time: time,
            link: link
          });
        });
        jadwal[hari] = list;
      });
      console.log("[API Proses] Jadwal rilis berhasil diambil.");
      return {
        success: true,
        code: 200,
        result: {
          source: `${this.api.base}${this.api.endpoints.jadwal()}`,
          updated: new Date().toISOString(),
          schedule: jadwal
        }
      };
    } catch (err) {
      console.error(`[API Proses] Terjadi kesalahan saat mengambil jadwal rilis: ${err.message}`);
      return {
        success: false,
        code: err?.response?.status || 500,
        result: {
          error: "Gagal mengambil data jadwal rilis dari Kurogaze.",
          details: err.message
        }
      };
    }
  }
  async ongoing() {
    console.log("[API Proses] Memulai pengambilan data anime ongoing.");
    try {
      const $ = await this.fetch(`${this.api.base}${this.api.endpoints.homepage()}`);
      const list = [];
      $(".carousel-wrapp .owl-carousel .article.item").each((em, el) => {
        const wrap = $(el);
        list.push({
          title: wrap.find("h3").text().trim(),
          link: wrap.find("a").attr("href"),
          image: wrap.find("img").attr("src"),
          time: wrap.find(".waktu-carousel").text().trim(),
          episode: wrap.find(".eps-terbaru").text().trim()
        });
      });
      console.log("[API Proses] Data anime ongoing berhasil diambil.");
      return {
        success: true,
        code: 200,
        result: {
          source: `${this.api.base}${this.api.endpoints.homepage()}`,
          updated: new Date().toISOString(),
          data: list
        }
      };
    } catch (err) {
      console.error(`[API Proses] Terjadi kesalahan saat mengambil data anime ongoing: ${err.message}`);
      return {
        success: false,
        code: err?.response?.status || 500,
        result: {
          error: "Gagal mengambil data anime ongoing dari Kurogaze.",
          details: err.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    page
  } = req.method === "GET" ? req.query : req.body;
  const kuroGrave = new KuroGraveAPI();
  try {
    switch (action) {
      case "search":
        if (query) {
          console.log(`[API Route] Menerima permintaan 'search' untuk query: '${query}' halaman: ${page || 1}`);
          const searchResult = await kuroGrave.search(query, page ? parseInt(page) : undefined);
          return res.status(200).json(searchResult);
        } else {
          console.warn("[API Route] Permintaan search tanpa parameter query.");
          return res.status(400).json({
            success: false,
            code: 400,
            result: {
              error: "Paramenter 'query' diperlukan untuk aksi 'search'."
            }
          });
        }
      case "details":
        if (url) {
          console.log(`[API Route] Menerima permintaan 'details' untuk URL: '${url}'`);
          const detailResult = await kuroGrave.details(url);
          return res.status(200).json(detailResult);
        } else {
          console.warn("[API Route] Permintaan details tanpa parameter url.");
          return res.status(400).json({
            success: false,
            code: 400,
            result: {
              error: "Paramenter 'url' diperlukan untuk aksi 'details'."
            }
          });
        }
      case "download":
        if (url) {
          console.log(`[API Route] Menerima permintaan 'download' untuk URL: '${url}'`);
          const detailResult = await kuroGrave.details(url);
          if (detailResult.success) {
            return res.status(200).json({
              success: true,
              code: 200,
              result: {
                title: detailResult.result.title,
                downloadLinks: detailResult.result.downloadLinks
              }
            });
          } else {
            return res.status(detailResult.code).json(detailResult);
          }
        } else {
          console.warn("[API Route] Permintaan download tanpa parameter url.");
          return res.status(400).json({
            success: false,
            code: 400,
            result: {
              error: "Paramenter 'url' diperlukan untuk aksi 'download'."
            }
          });
        }
      case "schedule":
        console.log("[API Route] Menerima permintaan 'schedule'.");
        const scheduleResult = await kuroGrave.schedule();
        return res.status(200).json(scheduleResult);
      case "ongoing":
        console.log("[API Route] Menerima permintaan 'ongoing'.");
        const ongoingResult = await kuroGrave.ongoing();
        return res.status(200).json(ongoingResult);
      default:
        console.warn(`[API Route] Aksi tidak valid: '${action}'`);
        return res.status(400).json({
          success: false,
          code: 400,
          result: {
            error: "Aksi tidak valid. Pilihan: 'search', 'details', 'download', 'schedule', 'ongoing'."
          }
        });
    }
  } catch (error) {
    console.error(`[API Route] Terjadi kesalahan server: ${error.message}`);
    return res.status(500).json({
      success: false,
      code: 500,
      result: {
        error: "Terjadi kesalahan internal server.",
        details: error.message
      }
    });
  }
}