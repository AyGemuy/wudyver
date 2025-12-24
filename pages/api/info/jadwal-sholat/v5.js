import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class JadwalSholat {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.baseUrl = "https://jadwalsholat.arina.id";
    this.cities = null;
    this.initialized = false;
    console.log("Proses: Instance Scraper berhasil dibuat.");
  }
  toSnakeCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
  }
  async ensureInit() {
    if (!this.initialized) {
      console.log("Proses: Inisialisasi sesi awal...");
      await this.client.get(this.baseUrl);
      this.initialized = true;
      console.log("Proses: Inisialisasi berhasil.");
    }
  }
  async ensureCities() {
    if (!this.cities) {
      console.log("Proses: Daftar kota belum ada, mengambil dari server...");
      await this.getCities();
    }
  }
  async getCities() {
    try {
      await this.ensureInit();
      console.log("Proses: Mengambil daftar semua kota...");
      const response = await this.client.get(this.baseUrl, {
        headers: this.getHeaders()
      });
      const $ = cheerio.load(response.data);
      const cityLinks = $('a[href*="jadwalsholat.arina.id/"]');
      this.cities = Array.from(cityLinks).map(link => {
        const href = $(link).attr("href") || "";
        const name = $(link).text()?.trim() || "";
        const slug = href.split("/").pop() || "";
        return {
          name: name,
          slug: slug,
          href: href
        };
      }).filter(city => city.name && city.slug);
      console.log(`Proses: Ditemukan ${this.cities?.length || 0} kota.`);
      return this.cities;
    } catch (error) {
      console.error("Error: Gagal mengambil daftar kota:", error?.message);
      return [];
    }
  }
  async search({
    city,
    ...rest
  }) {
    const normalizedCity = this.toSnakeCase(city);
    console.log(`\nProses: Memulai pencarian untuk kota "${city || "Tidak ada input"}" (normalized: ${normalizedCity})`);
    try {
      await this.ensureInit();
      await this.ensureCities();
      if (!city || !city.trim()) {
        console.log("Peringatan: Input kota kosong.");
        return {
          success: false,
          message: "Nama kota tidak boleh kosong. Silakan pilih salah satu kota dari daftar.",
          availableCities: this.cities?.slice(0, 20) || [],
          totalCities: this.cities?.length || 0
        };
      }
      const matchedCity = this.findCity(city, normalizedCity);
      if (!matchedCity) {
        console.log(`Peringatan: Kota "${city}" tidak ditemukan.`);
        const similarCities = this.findSimilarCities(city, normalizedCity);
        return {
          success: false,
          message: `Kota "${city}" tidak ditemukan.`,
          suggestion: similarCities.length > 0 ? "Mungkin maksud Anda:" : "Tidak ada kota yang mirip.",
          similarCities: similarCities.slice(0, 10)
        };
      }
      console.log(`Proses: Kota ditemukan -> ${matchedCity.name}. Mengambil jadwal...`);
      return await this.getPrayerTimes(matchedCity.slug);
    } catch (error) {
      console.error("Error: Terjadi kesalahan pada proses pencarian:", error?.message);
      return {
        success: false,
        error: error?.message
      };
    }
  }
  async getPrayerTimes(citySlug) {
    try {
      const url = `${this.baseUrl}/${citySlug}`;
      console.log(`Proses: Mengakses URL: ${url}`);
      const response = await this.client.get(url, {
        headers: this.getHeaders({
          referer: this.baseUrl
        })
      });
      const $ = cheerio.load(response.data);
      const snapshotData = this.extractSnapshotData($);
      if (!snapshotData) {
        throw new Error("Gagal mengekstrak data jadwal (snapshot tidak ditemukan).");
      }
      const prayerData = this.parsePrayerData(snapshotData);
      return {
        success: true,
        city: prayerData?.city_name || citySlug,
        province: prayerData?.province_name || "N/A",
        date: prayerData?.today || "N/A",
        hijriDate: prayerData?.hijriDate || "N/A",
        timezone: prayerData?.zonawaktu || "WIB",
        todayTimes: this.formatTodayTimes(prayerData?.todayTimes),
        nextPrayer: prayerData?.waktuSholat || "N/A",
        nextPrayerTime: prayerData?.lanjut || "N/A",
        monthlyTimes: this.getMonthlyTimes(prayerData)
      };
    } catch (error) {
      console.error(`Error: Gagal mengambil jadwal untuk ${citySlug}:`, error?.message);
      throw error;
    }
  }
  extractSnapshotData($) {
    try {
      const snapshotAttr = $("div[wire\\:snapshot]").attr("wire:snapshot");
      if (!snapshotAttr) {
        console.log('Peringatan: Atribut "wire:snapshot" tidak ditemukan di HTML.');
        return null;
      }
      const cleanedJsonString = this.unescapeJson(snapshotAttr);
      const parsed = JSON.parse(cleanedJsonString);
      return parsed?.data || null;
    } catch (error) {
      console.error("Error: Gagal mengekstrak atau mem-parsing snapshot:", error?.message);
      return null;
    }
  }
  parsePrayerData(snapshot) {
    return snapshot || {};
  }
  formatTodayTimes(todayTimesArray) {
    if (!todayTimesArray || !Array.isArray(todayTimesArray)) {
      return {};
    }
    const timesObj = todayTimesArray[0] || {};
    return {
      Imsak: timesObj.Imsak || "N/A",
      Subuh: timesObj.Subuh || "N/A",
      Dzuhur: timesObj.Dzuhur || "N/A",
      Ashar: timesObj.Ashar || "N/A",
      Maghrib: timesObj.Maghrib || "N/A",
      Isya: timesObj["Isya'"] || timesObj.Isya || "N/A"
    };
  }
  getMonthlyTimes(prayerData) {
    const prayerTimesArray = prayerData?.prayerTimes;
    if (!prayerTimesArray || !Array.isArray(prayerTimesArray)) {
      return {};
    }
    const monthlyData = prayerTimesArray[0] || {};
    const result = {};
    for (const date in monthlyData) {
      if (!date.match(/^\d{2}-\d{2}-\d{4}$/)) {
        continue;
      }
      const dayData = monthlyData[date];
      if (Array.isArray(dayData) && dayData[0]) {
        result[date] = {
          Imsak: dayData[0].Imsak || "N/A",
          Fajr: dayData[0].Fajr || "N/A",
          Sunrise: dayData[0].Sunrise || "N/A",
          Dhuhr: dayData[0].Dhuhr || "N/A",
          Asr: dayData[0].Asr || "N/A",
          Maghrib: dayData[0].Maghrib || "N/A",
          Isha: dayData[0].Isha || "N/A",
          Sunset: dayData[0].Sunset || "N/A"
        };
      }
    }
    return result;
  }
  unescapeJson(str) {
    return str?.replace(/&quot;/g, '"')?.replace(/&amp;/g, "&") || "{}";
  }
  findCity(query, normalizedQuery) {
    if (!this.cities) return null;
    normalizedQuery = normalizedQuery || this.toSnakeCase(query);
    return this.cities.find(city => this.toSnakeCase(city.slug) === normalizedQuery || this.toSnakeCase(city.name) === normalizedQuery);
  }
  findSimilarCities(query, normalizedQuery) {
    if (!this.cities) return [];
    normalizedQuery = normalizedQuery || this.toSnakeCase(query);
    return this.cities.filter(city => this.toSnakeCase(city.name).includes(normalizedQuery) || this.toSnakeCase(city.slug).includes(normalizedQuery));
  }
  getHeaders(additional = {}) {
    return {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-User": "?1",
      "Sec-Fetch-Dest": "document",
      ...additional
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.city) {
    return res.status(400).json({
      error: "Paramenter 'city' wajib diisi untuk action 'search'."
    });
  }
  try {
    const api = new JadwalSholat();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}