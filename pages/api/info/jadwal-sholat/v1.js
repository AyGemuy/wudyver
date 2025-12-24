import axios from "axios";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class GlobalPrayerTime {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json"
    };
    this.axiosInstance = axios.create({
      timeout: 3e4,
      headers: this.headers
    });
    this.cityCache = new Map();
  }
  toSnakeCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
  }
  formatDate() {
    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    };
    return now.toLocaleDateString("id-ID", options);
  }
  getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }
  async getCityCoordinates(city, country = "") {
    try {
      const normalizedCity = this.toSnakeCase(city);
      const normalizedCountry = this.toSnakeCase(country);
      const cacheKey = `${normalizedCity}_${normalizedCountry}`;
      console.log(`📍 Mencari koordinat: ${city}${country ? ", " + country : ""} (normalized: ${normalizedCity}_${normalizedCountry})`);
      if (this.cityCache.has(cacheKey)) {
        return this.cityCache.get(cacheKey);
      }
      const baseUrl = "https://nominatim.openstreetmap.org/search";
      const proxiedUrl = `${proxy}${encodeURIComponent(baseUrl)}`;
      const response = await this.axiosInstance.get(proxiedUrl, {
        params: {
          q: `${normalizedCity} ${normalizedCountry}`,
          format: "json",
          limit: 1
        }
      });
      if (response.data && response.data.length > 0) {
        const result = {
          lat: parseFloat(response.data[0].lat),
          lon: parseFloat(response.data[0].lon),
          display_name: response.data[0].display_name
        };
        this.cityCache.set(cacheKey, result);
        return result;
      }
      throw new Error("Kota tidak ditemukan");
    } catch (error) {
      throw new Error(`Gagal mendapatkan koordinat kota: ${error.message}`);
    }
  }
  async getPrayerTimesByCoordinates(lat, lon, method = 1) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const api1 = await this.tryAladhanAPI(lat, lon, year, month, day, method);
      if (api1) return api1;
      const api2 = await this.tryPrayerTimesAPI(lat, lon, year, month, day);
      if (api2) return api2;
      const api3 = await this.tryIslamicFinderAPI(lat, lon, year, month, day);
      if (api3) return api3;
      throw new Error("Semua API gagal");
    } catch (error) {
      throw new Error(`Gagal mendapatkan jadwal sholat: ${error.message}`);
    }
  }
  async tryAladhanAPI(lat, lon, year, month, day, method) {
    try {
      const response = await this.axiosInstance.get(`http://api.aladhan.com/v1/timings/${day}-${month}-${year}`, {
        params: {
          latitude: lat,
          longitude: lon,
          method: method,
          school: 1
        }
      });
      if (response.data && response.data.data) {
        const data = response.data.data;
        const timings = data.timings;
        return {
          subuh: timings.Fajr,
          syuruq: timings.Sunrise,
          dzuhur: timings.Dhuhr,
          ashar: timings.Asr,
          maghrib: timings.Maghrib,
          isya: timings.Isha,
          metode: this.getMethodName(method),
          sumber: "Aladhan API"
        };
      }
    } catch (error) {
      console.log("Aladhan API gagal");
    }
    return null;
  }
  async tryPrayerTimesAPI(lat, lon, year, month, day) {
    try {
      const response = await this.axiosInstance.get(`http://api.pray.zone/v2/times/today.json`, {
        params: {
          latitude: lat,
          longitude: lon,
          elevation: 0,
          school: 1
        }
      });
      if (response.data && response.data.results) {
        const data = response.data.results.datetime[0].times;
        return {
          subuh: data.Fajr,
          syuruq: data.Sunrise,
          dzuhur: data.Dhuhr,
          ashar: data.Asr,
          maghrib: data.Maghrib,
          isya: data.Isha,
          metode: "Prayer Times API",
          sumber: "Prayer Zone"
        };
      }
    } catch (error) {
      console.log("Prayer Times API gagal");
    }
    return null;
  }
  async tryIslamicFinderAPI(lat, lon, year, month, day) {
    try {
      const response = await this.axiosInstance.get(`https://www.islamicfinder.us/index.php/api/prayer_times`, {
        params: {
          latitude: lat,
          longitude: lon,
          timezone: "auto",
          method: 5,
          month: month,
          year: year
        }
      });
      if (response.data && response.data.data) {
        const data = response.data.data[day - 1];
        return {
          subuh: data.fajr,
          syuruq: data.sunrise,
          dzuhur: data.dhuhr,
          ashar: data.asr,
          maghrib: data.maghrib,
          isya: data.isha,
          metode: "Islamic Finder",
          sumber: "IslamicFinder API"
        };
      }
    } catch (error) {
      console.log("IslamicFinder API gagal");
    }
    return null;
  }
  getMethodName(method) {
    const methods = {
      1: "University of Islamic Sciences, Karachi",
      2: "Islamic Society of North America",
      3: "Muslim World League",
      4: "Umm Al-Qura University, Makkah",
      5: "Egyptian General Authority of Survey",
      6: "Institute of Geophysics, University of Tehran",
      7: "Gulf Region",
      8: "Kuwait",
      9: "Qatar",
      10: "Majlis Ugama Islam Singapura",
      11: "Union Organization islamic de France",
      12: "Diyanet İşleri Başkanlığı, Turkey",
      13: "Spiritual Administration of Muslims of Russia",
      14: "Moonsighting Committee Worldwide"
    };
    return methods[method] || "Standard";
  }
  getCalculationMethod(country) {
    const normalizedCountry = this.toSnakeCase(country);
    const countryMethods = {
      indonesia: 1,
      malaysia: 1,
      singapore: 10,
      brunei: 1,
      saudi_arabia: 4,
      egypt: 5,
      turkey: 12,
      iran: 6,
      kuwait: 8,
      qatar: 9,
      uae: 7,
      usa: 2,
      canada: 2,
      uk: 2,
      france: 11,
      germany: 2,
      russia: 13
    };
    return countryMethods[normalizedCountry] || 1;
  }
  getNextPrayer(prayerTimes) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const prayers = [{
      name: "Subuh",
      time: this.timeToMinutes(prayerTimes.subuh)
    }, {
      name: "Dzuhur",
      time: this.timeToMinutes(prayerTimes.dzuhur)
    }, {
      name: "Ashar",
      time: this.timeToMinutes(prayerTimes.ashar)
    }, {
      name: "Maghrib",
      time: this.timeToMinutes(prayerTimes.maghrib)
    }, {
      name: "Isya",
      time: this.timeToMinutes(prayerTimes.isya)
    }];
    for (let prayer of prayers) {
      if (prayer.time > currentTime) {
        const minutesLeft = prayer.time - currentTime;
        return {
          sholat_berikutnya: prayer.name,
          waktu_tersisa: `${Math.floor(minutesLeft / 60)} jam ${minutesLeft % 60} menit`,
          jam: prayerTimes[prayer.name.toLowerCase()]
        };
      }
    }
    return {
      sholat_berikutnya: "Subuh",
      waktu_tersisa: "Besok pagi",
      jam: prayerTimes.subuh
    };
  }
  timeToMinutes(timeStr) {
    const [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period) {
      if (period.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
    }
    return hours * 60 + minutes;
  }
  async getPrayerSchedule(city, country = "") {
    try {
      const normalizedCity = this.toSnakeCase(city);
      const normalizedCountry = this.toSnakeCase(country);
      console.log(`📍 Mencari koordinat: ${city}${country ? ", " + country : ""} (normalized: ${normalizedCity}${normalizedCountry ? ", " + normalizedCountry : ""})`);
      const coordinates = await this.getCityCoordinates(city, country);
      const method = this.getCalculationMethod(country || "indonesia");
      console.log(`🕌 Mendapatkan jadwal sholat...`);
      const prayerTimes = await this.getPrayerTimesByCoordinates(coordinates.lat, coordinates.lon, method);
      const nextPrayer = this.getNextPrayer(prayerTimes);
      return {
        success: true,
        lokasi: coordinates.display_name,
        kota: city,
        negara: country || "Indonesia",
        tanggal: this.formatDate(),
        update: this.getCurrentTime(),
        koordinat: {
          latitude: coordinates.lat,
          longitude: coordinates.lon
        },
        metode_perhitungan: prayerTimes.metode,
        sumber: prayerTimes.sumber,
        jadwal: {
          subuh: prayerTimes.subuh,
          syuruq: prayerTimes.syuruq,
          dzuhur: prayerTimes.dzuhur,
          ashar: prayerTimes.ashar,
          maghrib: prayerTimes.maghrib,
          isya: prayerTimes.isya
        },
        sholat_berikutnya: nextPrayer
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
class PrayerTime {
  constructor() {
    this.prayerTime = new GlobalPrayerTime();
  }
  async search({
    city,
    country = ""
  }) {
    try {
      const normalizedCity = this.prayerTime.toSnakeCase(city);
      console.log(`🔍 Pencarian jadwal sholat: ${city}${country ? ", " + country : ""} (normalized city: ${normalizedCity})`);
      if (!city || typeof city !== "string") {
        return {
          success: false,
          error: "Nama kota tidak valid"
        };
      }
      const result = await this.prayerTime.getPrayerSchedule(city, country);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.city) {
    return res.status(400).json({
      error: "city are required"
    });
  }
  try {
    const api = new PrayerTime();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}