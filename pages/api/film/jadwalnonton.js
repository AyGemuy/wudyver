import axios from "axios";
import * as cheerio from "cheerio";
class JadwalNonton {
  constructor() {
    this.baseUrl = "https://jadwalnonton.com";
    this.index = {
      location: {
        description: "Mendapatkan daftar lokasi/kota yang tersedia (indeks dimulai dari 1)",
        example: "await jn.search({ location: 1 })"
      },
      theater: {
        description: "Mendapatkan daftar bioskop di kota tertentu (indeks dimulai dari 1)",
        params: {
          location: "number (indeks) atau string (nama kota), default: 1 (semua kota)",
          theater: "number (indeks theater yang ingin ditampilkan)"
        },
        example: "await jn.search({ location: 1, theater: 1 })"
      },
      detail: {
        description: "Mendapatkan detail bioskop termasuk jadwal film (indeks dimulai dari 1)",
        params: {
          location: "number (indeks) atau string (nama kota)",
          theater: "number (indeks) atau string (url)",
          detail: "number (indeks detail yang ingin ditampilkan)"
        },
        example: "await jn.search({ location: 1, theater: 1, detail: 1 })"
      }
    };
  }
  async search({
    location = null,
    theater = null,
    detail = null
  } = {}) {
    console.log(`Memulai pencarian location: ${location}, theater: ${theater}, detail: ${detail}`);
    try {
      if (location === null && theater === null && detail === null) {
        return {
          message: "Silakan pilih location terlebih dahulu",
          usage: "await jn.search({ location: 1 }) // untuk melihat daftar lokasi",
          example: {
            getAllLocations: "await jn.search({ location: 1 })",
            getTheaters: "await jn.search({ location: 1, theater: 1 })",
            getDetail: "await jn.search({ location: 1, theater: 1, detail: 1 })"
          }
        };
      }
      if (location !== null && theater === null && detail === null) {
        const locationData = await this._getLocations();
        return {
          ...locationData,
          message: "Pilih theater untuk melihat daftar bioskop",
          nextUsage: "await jn.search({ location: [location_id], theater: 1 })",
          example: "await jn.search({ location: 1, theater: 1 })"
        };
      }
      if (location !== null && theater === null) {
        return {
          message: "Paramenter theater diperlukan untuk melihat daftar bioskop",
          usage: `await jn.search({ location: ${location}, theater: 1 })`,
          availableLocations: "Gunakan await jn.search({ location: 1 }) untuk melihat daftar lokasi"
        };
      }
      if (location !== null && theater !== null && detail === null) {
        const theaterData = await this._getTheaters(location);
        return {
          ...theaterData,
          message: "Pilih detail untuk melihat detail bioskop",
          nextUsage: `await jn.search({ location: ${location}, theater: [theater_id], detail: 1 })`,
          example: `await jn.search({ location: ${location}, theater: 1, detail: 1 })`
        };
      }
      if (location !== null && theater !== null && detail === null) {
        return {
          message: "Paramenter detail diperlukan untuk melihat detail bioskop",
          usage: `await jn.search({ location: ${location}, theater: ${theater}, detail: 1 })`,
          availableTheaters: `Gunakan await jn.search({ location: ${location}, theater: 1 }) untuk melihat daftar bioskop`
        };
      }
      if (location !== null && theater !== null && detail !== null) {
        return await this._getTheaterDetail(theater);
      }
    } catch (error) {
      console.error(`[ERROR] Gagal melakukan pencarian:`, error.message);
      throw error;
    } finally {
      console.log(`Pencarian selesai`);
    }
  }
  async _getLocations() {
    console.log("Memulai proses mendapatkan lokasi...");
    try {
      const response = await axios.get(`${this.baseUrl}/bioskop`);
      console.log("Berhasil mendapatkan response lokasi");
      const $ = cheerio.load(response.data);
      console.log("Memproses data lokasi...");
      const locations = $(".ctlist.dfinder.wmal li").map((i, el) => {
        const link = $(el).find("a");
        return {
          id: i + 1,
          name: link.text().trim(),
          url: link.attr("href"),
          key: link.data("k") || null
        };
      }).get();
      const result = {
        allCities: {
          id: 0,
          name: "Semua kota",
          url: `${this.baseUrl}/bioskop/`,
          active: $(".ctlist.hons li").first().hasClass("active")
        },
        nearest: {
          id: -1,
          name: "Terdekat",
          url: $(".ctlist.hons li.mekan a").data("next"),
          recommended: true
        },
        cities: locations
      };
      console.log(`Berhasil mendapatkan ${locations.length} lokasi`);
      return result;
    } catch (error) {
      console.error("[ERROR] Gagal mendapatkan lokasi:", error.message);
      throw new Error("Gagal memuat daftar lokasi");
    }
  }
  async _getTheaters(location = 1) {
    console.log(`Memulai proses mendapatkan bioskop untuk location: ${location}`);
    try {
      console.log("Mendapatkan daftar lokasi...");
      const locations = await this._getLocations();
      let url;
      let locationName = "";
      if (typeof location === "number") {
        const adjustedIndex = location - 1;
        if (adjustedIndex === -1) {
          url = locations.nearest.url;
          locationName = locations.nearest.name;
        } else if (adjustedIndex >= 0 && adjustedIndex < locations.cities.length) {
          url = locations.cities[adjustedIndex].url;
          locationName = locations.cities[adjustedIndex].name;
        } else {
          url = locations.allCities.url;
          locationName = locations.allCities.name;
        }
      } else if (typeof location === "string") {
        const found = locations.cities.find(c => c.name.toLowerCase().includes(location.toLowerCase()));
        url = found?.url || locations.allCities.url;
        locationName = found?.name || locations.allCities.name;
      } else {
        url = locations.allCities.url;
        locationName = locations.allCities.name;
      }
      console.log(`Mengambil data bioskop dari URL: ${url} (${locationName})`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const theaters = $(".item.theater").map((i, el) => {
        const theater = $(el);
        return {
          id: i + 1,
          name: theater.find(".judul").text().trim(),
          url: theater.find("a").first().attr("href"),
          image: theater.find("img.poster").attr("src"),
          scheduleUrl: theater.find("a.mojadwal").attr("href"),
          type: theater.find(".icon").attr("class")?.split(" ").pop() || "unknown"
        };
      }).get();
      const result = {
        city: locationName,
        theaters: theaters
      };
      console.log(`Berhasil mendapatkan ${theaters.length} bioskop di ${locationName}`);
      return result;
    } catch (error) {
      console.error("[ERROR] Gagal mendapatkan daftar bioskop:", error.message);
      throw new Error(`Gagal memuat bioskop untuk location: ${location}`);
    }
  }
  async _getTheaterDetail(theater = 1) {
    console.log(`Memulai proses mendapatkan detail bioskop untuk theater: ${theater}`);
    try {
      let url;
      let theaterName = "";
      if (typeof theater === "number") {
        console.log("Mendapatkan daftar bioskop...");
        const theaters = await this._getTheaters(1);
        const adjustedIndex = theater - 1;
        if (adjustedIndex >= 0 && adjustedIndex < theaters.theaters.length) {
          url = theaters.theaters[adjustedIndex].url;
          theaterName = theaters.theaters[adjustedIndex].name;
        } else {
          throw new Error(`Bioskop dengan indeks ${theater} tidak ditemukan`);
        }
      } else if (typeof theater === "string") {
        url = theater.startsWith("http") ? theater : `${this.baseUrl}${theater.startsWith("/") ? "" : "/"}${theater}`;
        theaterName = "Custom URL";
      } else {
        throw new Error("Paramenter theater tidak valid");
      }
      console.log(`Mengambil detail bioskop dari URL: ${url} (${theaterName})`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const addressText = $(".topdesc").contents().filter((_, el) => el.nodeType === 3).map((_, el) => $(el).text().trim()).get().join(" ").replace(/\s+/g, " ").trim();
      const movies = $(".thealist.mvx .item").map((i, el) => {
        const movie = $(el);
        return {
          id: i + 1,
          title: movie.find("h2 a").text().trim(),
          url: movie.find("h2 a").attr("href"),
          poster: movie.find(".poster").attr("src"),
          rating: {
            age: movie.find(".rating").text().trim(),
            color: movie.find(".rating").attr("class")?.split(" ").pop(),
            title: movie.find(".rating").attr("title")
          },
          genre: movie.find("p").eq(0).text().trim(),
          actors: movie.find("p").eq(1).text().replace("Actors : ", "").trim(),
          description: movie.find("p").eq(2).text().trim(),
          price: movie.find(".htm").text().trim(),
          type: movie.find(".showgroup").text().trim(),
          schedules: movie.find(".usch li").map((i, schEl) => ({
            id: i + 1,
            time: $(schEl).text().trim(),
            available: $(schEl).hasClass("active")
          })).get()
        };
      }).get();
      const comments = $(".comment-body").map((i, el) => {
        const comment = $(el);
        return {
          id: i + 1,
          user: comment.find("header a").text().trim(),
          date: comment.find("header .text-muted").text().trim(),
          memberSince: comment.find(".text-about").text().replace("Member since ", "").trim(),
          rating: comment.find(".starlist i").length,
          content: comment.find(".panel-body p").text().trim(),
          likes: comment.find(".btn_like").text().replace(/[^0-9]/g, "") || "0",
          dislikes: comment.find(".btn_dislike").text().replace(/[^0-9]/g, "") || "0"
        };
      }).get().filter(comment => comment.user && comment.content && comment.rating > 0);
      const result = {
        title: $("h1").text().trim(),
        address: addressText,
        image: $(".imgt").attr("src"),
        mapUrl: $("#tmap").attr("src"),
        dates: $(".filterlist#tgl_ftab li").map((i, el) => ({
          id: i + 1,
          date: $(el).text().trim(),
          url: $(el).find("a").data("ref")
        })).get(),
        movies: movies,
        comments: comments
      };
      console.log(`Berhasil mendapatkan detail bioskop: ${result.title}`);
      console.log(`- ${movies.length} film`);
      console.log(`- ${comments.length} komentar`);
      return result;
    } catch (error) {
      console.error("[ERROR] Gagal mendapatkan detail bioskop:", error.message);
      throw new Error(`Gagal memuat detail bioskop untuk theater: ${theater}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const location = params.location ? isNaN(params.location) ? params.location : parseInt(params.location) : null;
  const theater = params.theater ? isNaN(params.theater) ? params.theater : parseInt(params.theater) : null;
  const detail = params.detail ? isNaN(params.detail) ? params.detail : parseInt(params.detail) : null;
  const jn = new JadwalNonton();
  try {
    const result = await jn.search({
      location: location,
      theater: theater,
      detail: detail
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}