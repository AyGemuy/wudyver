import axios from "axios";
import * as cheerio from "cheerio";
class PrayerTimeScraper {
  constructor() {
    this.baseUrl = "https://sholat.uma.ac.id";
    this.client = axios.create();
    console.log("✅ PrayerTime Scraper berhasil dibuat.");
  }
  toSnakeCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
  }
  async getWithRetry(url, config, retries = 3, backoff = 1e3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.client.get(url, config);
        return response;
      } catch (error) {
        if (error.response?.status === 429 && i < retries - 1) {
          const waitTime = backoff * Math.pow(2, i);
          console.log(`⚠️ HTTP 429: Too Many Requests. Retrying in ${waitTime}ms...`);
          await this.delay(waitTime);
          continue;
        }
        throw error;
      }
    }
  }
  async getCityList() {
    try {
      console.log("🔍 Mengambil daftar kota...");
      const url = `${this.baseUrl}/v2/kota`;
      const response = await this.getWithRetry(url, {
        headers: {
          ...this.getHeaders(),
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const data = response.data;
      if (data.error === "0" && data.data) {
        console.log(`✅ Ditemukan ${data.data.length} kota.`);
        return data.data.map(item => ({
          id: item.id,
          name: item.lokasi.replace(/KAB\. |KOTA | Regency| City/gi, "").trim(),
          normalizedName: this.toSnakeCase(item.lokasi.replace(/KAB\. |KOTA | Regency| City/gi, "").trim())
        }));
      } else {
        console.error("❌ Gagal mendapatkan daftar kota:", data.message || "Unknown error");
        return [];
      }
    } catch (error) {
      console.error("❌ Error saat mengambil daftar kota:", error?.message);
      return [];
    }
  }
  async getCityId(cityName) {
    try {
      const normalizedCityName = this.toSnakeCase(cityName);
      console.log(`🔍 Mencari ID kota untuk: ${cityName} (normalized: ${normalizedCityName})...`);
      const url = `${this.baseUrl}/v2/kota`;
      const response = await this.getWithRetry(url, {
        headers: {
          ...this.getHeaders(),
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const data = response.data;
      if (data.error === "0" && data.data) {
        const city = data.data.find(item => this.toSnakeCase(item.lokasi.replace(/KAB\. |KOTA | Regency| City/gi, "").trim()).includes(normalizedCityName));
        if (city) {
          console.log(`✅ ID kota ditemukan: ${city.id} (${city.lokasi})`);
          return city.id;
        } else {
          console.error(`⚠️ Kota "${cityName}" tidak ditemukan.`);
          return null;
        }
      } else {
        console.error("❌ Gagal mendapatkan data kota:", data.message || "Unknown error");
        return null;
      }
    } catch (error) {
      console.error("❌ Error saat mencari ID kota:", error?.message);
      console.error("Gagal mengambil data, periksa koneksi atau hubungi admin.");
      return null;
    }
  }
  async getPrayerTimes(cityId, targetDate) {
    try {
      console.log(`📡 Mengambil jadwal sholat untuk kota ID: ${cityId} pada ${targetDate}...`);
      const url = `${this.baseUrl}/v2/s?kota=${cityId}`;
      const response = await this.getWithRetry(url, {
        headers: {
          ...this.getHeaders(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      const $ = cheerio.load(response.data);
      const prayerTimes = {};
      const availableDates = [];
      const cityName = $(".modal-header").text().match(/Jadwal Sholat (.*?)(?: & Sekitarnya|$)/i)?.[1]?.replace(/KAB\. |KOTA | Regency| City/gi, "").trim() || "Unknown";
      $("#sholat-lengkap table tbody tr").each(function() {
        const dateText = $(this).find("td").first().text().trim();
        const dateMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
          const [day, month, year] = dateMatch[1].split("/");
          availableDates.push(`${year}-${month}-${day}`);
        }
      });
      if (targetDate) {
        const dateFormatted = targetDate.replace(/(\d{4})-(\d{2})-(\d{2})/, "$3/$2/$1");
        const row = $("#sholat-lengkap table tbody tr").filter(function() {
          const dateText = $(this).find("td").first().text().trim();
          return dateText.match(new RegExp(`\\b${dateFormatted}\\b`));
        });
        if (row.length) {
          const cells = row.find("td");
          prayerTimes.Imsak = cells.eq(1).text().trim();
          prayerTimes.Subuh = cells.eq(2).text().trim();
          prayerTimes.Dzuhur = cells.eq(3).text().trim();
          prayerTimes.Ashar = cells.eq(4).text().trim();
          prayerTimes.Maghrib = cells.eq(5).text().trim();
          prayerTimes.Isya = cells.eq(6).text().trim();
          console.log(`✅ Jadwal sholat ditemukan untuk ${dateFormatted}.`);
        } else {
          console.error(`❌ Tidak ditemukan jadwal untuk tanggal ${dateFormatted}.`);
          return {
            city: cityName,
            prayerTimes: null,
            availableDates: availableDates
          };
        }
      }
      return {
        city: cityName,
        prayerTimes: prayerTimes,
        availableDates: availableDates
      };
    } catch (error) {
      console.error("❌ Error saat mengambil jadwal sholat:", error?.message);
      return null;
    }
  }
  async getHijriDate() {
    try {
      console.log("📅 Mengambil tanggal Hijri...");
      const url = `${this.baseUrl}/get/hijri/`;
      const response = await this.getWithRetry(url, {
        headers: this.getHeaders()
      });
      const data = response.data;
      if (data.error === "0" && data.data?.data?.hijri) {
        const hijri = `${data.data.data.hijri.day} ${data.data.data.hijri.month.en} ${data.data.data.hijri.year} H`;
        console.log(`✅ Tanggal Hijri: ${hijri}`);
        return hijri;
      } else {
        console.error("❌ Gagal mendapatkan tanggal Hijri.");
        return null;
      }
    } catch (error) {
      console.error("❌ Error saat mengambil tanggal Hijri:", error?.message);
      return null;
    }
  }
  calculateNextPrayer(prayerTimes, currentTime, requestedDate) {
    const now = new Date(currentTime);
    const dateParts = requestedDate.split("-");
    const targetDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0));
    const isToday = now.toISOString().slice(0, 10) === requestedDate;
    const prayers = [{
      name: "Imsak",
      time: prayerTimes.Imsak
    }, {
      name: "Subuh",
      time: prayerTimes.Subuh
    }, {
      name: "Dzuhur",
      time: prayerTimes.Dzuhur
    }, {
      name: "Ashar",
      time: prayerTimes.Ashar
    }, {
      name: "Maghrib",
      time: prayerTimes.Maghrib
    }, {
      name: "Isya",
      time: prayerTimes.Isya
    }];
    let nextPrayer = null;
    let minDiff = Infinity;
    for (const prayer of prayers) {
      if (!prayer.time || prayer.time === "N/A") continue;
      const [hours, minutes] = prayer.time.split(":").map(Number);
      const prayerDateTime = new Date(targetDate);
      prayerDateTime.setHours(hours, minutes, 0, 0);
      const prayerTimeWIB = new Date(prayerDateTime.getTime() - 7 * 60 * 60 * 1e3);
      const diff = (prayerTimeWIB - now) / (1e3 * 60);
      if (isToday && diff > 0 && diff < minDiff) {
        minDiff = diff;
        nextPrayer = {
          prayer: prayer.name,
          time: prayer.time,
          status: "Selanjutnya",
          remainingMinutes: Math.round(diff),
          fullDate: `${requestedDate} ${prayer.time}:00`
        };
      }
    }
    if (!nextPrayer && isToday) {
      nextPrayer = {
        prayer: "Imsak",
        time: prayerTimes.Imsak,
        status: "Selanjutnya",
        remainingMinutes: Math.round(24 * 60 - (now.getHours() * 60 + now.getMinutes()) + Number(prayerTimes.Imsak.split(":")[0]) * 60 + Number(prayerTimes.Imsak.split(":")[1])),
        fullDate: `${new Date(targetDate.getTime() + 24 * 60 * 60 * 1e3).toISOString().slice(0, 10)} ${prayerTimes.Imsak}:00`
      };
    } else if (!isToday) {
      nextPrayer = {
        prayer: "Imsak",
        time: prayerTimes.Imsak,
        status: "Selanjutnya",
        remainingMinutes: null,
        fullDate: `${requestedDate} ${prayerTimes.Imsak}:00`
      };
    }
    if (nextPrayer && isToday && Math.abs(minDiff) <= 1) {
      nextPrayer.status = "Sekarang";
      nextPrayer.remainingMinutes = null;
    } else if (nextPrayer && isToday && Math.abs(minDiff) < 15) {
      nextPrayer.status = "Sekarang";
    }
    return nextPrayer;
  }
  validateAndFormatDate(date) {
    let targetDate;
    if (date && date.trim()) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        console.error(`⚠️ Tanggal "${date}" tidak valid.`);
        return null;
      }
      targetDate = parsedDate.toISOString().slice(0, 10);
    } else {
      targetDate = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta"
      }).replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2");
    }
    return targetDate;
  }
  async search({
    city,
    date
  }) {
    const normalizedCity = this.toSnakeCase(city);
    console.log("\n" + "=".repeat(50));
    console.log(`🕌 PENCARIAN JADWAL SHOLAT: ${city || "Kosong"} (normalized: ${normalizedCity}) ${date ? `(${date})` : "(Tanggal saat ini)"}`);
    console.log("=".repeat(50));
    try {
      if (!city || !city.trim()) {
        const cityList = await this.getCityList();
        return {
          success: false,
          message: "Nama kota tidak boleh kosong.",
          cityList: cityList.length > 0 ? cityList : null,
          suggestion: "Pilih kota dari daftar berikut atau masukkan nama kota yang valid."
        };
      }
      const cityId = await this.getCityId(city);
      if (!cityId) {
        const cityList = await this.getCityList();
        return {
          success: false,
          message: `Kota "${city}" tidak ditemukan.`,
          cityList: cityList.length > 0 ? cityList : null,
          suggestion: "Pilih kota dari daftar berikut atau periksa ejaan kota."
        };
      }
      const targetDate = this.validateAndFormatDate(date);
      const now = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta"
      }).replace(",", "").replace(/(\d+)\/(\d+)\/(\d+) (\d+:\d+:\d+) (AM|PM)/, "$3-$1-$2 $4 $5");
      if (!targetDate) {
        const prayerData = await this.getPrayerTimes(cityId, null);
        return {
          success: false,
          message: `Tanggal "${date || ""}" tidak ditemukan.`,
          cityList: null,
          dateList: prayerData?.availableDates.length > 0 ? prayerData.availableDates : null,
          suggestion: "Pilih tanggal dari daftar berikut atau masukkan tanggal yang valid."
        };
      }
      const prayerData = await this.getPrayerTimes(cityId, targetDate);
      if (!prayerData) {
        const cityList = await this.getCityList();
        return {
          success: false,
          message: "Gagal mendapatkan jadwal sholat. Periksa koneksi atau hubungi admin.",
          cityList: cityList.length > 0 ? cityList : null,
          suggestion: "Pilih kota dari daftar berikut atau coba lagi nanti."
        };
      }
      if (!prayerData.prayerTimes) {
        return {
          success: false,
          message: `Tanggal "${targetDate}" tidak ditemukan.`,
          cityList: null,
          dateList: prayerData.availableDates.length > 0 ? prayerData.availableDates : null,
          suggestion: "Pilih tanggal dari daftar berikut atau masukkan tanggal yang valid."
        };
      }
      const hijriDate = await this.getHijriDate();
      const nextPrayer = this.calculateNextPrayer(prayerData.prayerTimes, now, targetDate);
      return {
        success: true,
        location: {
          city: prayerData.city,
          cityId: cityId,
          country: "Indonesia",
          countryCode: "ID"
        },
        prayerTimes: {
          Imsak: prayerData.prayerTimes.Imsak || "N/A",
          Subuh: prayerData.prayerTimes.Subuh || "N/A",
          Terbit: "N/A",
          Dzuhur: prayerData.prayerTimes.Dzuhur || "N/A",
          Ashar: prayerData.prayerTimes.Ashar || "N/A",
          Maghrib: prayerData.prayerTimes.Maghrib || "N/A",
          Isya: prayerData.prayerTimes.Isya || "N/A"
        },
        nextPrayer: {
          name: nextPrayer.prayer,
          time: nextPrayer.time,
          status: nextPrayer.status,
          remainingMinutes: nextPrayer.remainingMinutes,
          fullDate: nextPrayer.fullDate
        },
        hijriDate: hijriDate || "N/A",
        date: now,
        requestedDate: targetDate
      };
    } catch (error) {
      console.error("❌ Terjadi kesalahan:", error?.message);
      const cityList = await this.getCityList();
      return {
        success: false,
        message: "Gagal mengambil data. Periksa koneksi atau hubungi admin.",
        cityList: cityList.length > 0 ? cityList : null,
        suggestion: "Pilih kota dari daftar berikut atau coba lagi nanti."
      };
    }
  }
  getHeaders(additional = {}) {
    return {
      "Accept-Language": "id-ID",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      ...additional
    };
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const api = new PrayerTimeScraper();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}