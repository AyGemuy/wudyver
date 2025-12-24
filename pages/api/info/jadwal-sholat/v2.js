import axios from "axios";
import * as cheerio from "cheerio";
class JadwalSholat {
  constructor() {
    this._log("INIT", "Initializing JadwalSholat class");
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=0, i",
      referer: "https://jadwalsholat.org/jadwal-sholat/monthly.php?id=235",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "iframe",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  _log(context, message, data = {}) {
    const timestamp = new Date().toISOString();
    const formattedData = Object.keys(data).length ? ` | Data: ${JSON.stringify(data)}` : "";
    console.log(`[${timestamp}] [${context}] ${message}${formattedData}`);
  }
  _toSnakeCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
  }
  _calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    str1 = this._toSnakeCase(str1);
    str2 = this._toSnakeCase(str2);
    if (str1 === str2) return 1;
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
      }
    }
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  }
  async getCitySelectOption() {
    this._log("GET_CITY_OPTIONS", "Fetching city select options");
    try {
      const response = await axios.get("https://jadwalsholat.org/jadwal-sholat/monthly.php", {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const cities = $(".inputcity > option").map(function() {
        const kota = $(this).text().trim().toLowerCase().split(",")[0];
        const id = $(this).attr("value").trim();
        const slug = this._toSnakeCase(kota);
        return {
          kota: kota,
          id: id,
          slug: slug
        };
      }.bind(this)).get().sort((a, b) => a.id.localeCompare(b.id));
      this._log("GET_CITY_OPTIONS", `Retrieved ${cities.length} city options`, {
        cityCount: cities.length
      });
      return cities;
    } catch (error) {
      this._log("GET_CITY_OPTIONS_ERROR", "Error fetching city options", {
        error: error.message || error
      });
      throw new Error("Error fetching city options");
    }
  }
  async fetchMonthlyData(id) {
    this._log("FETCH_MONTHLY_DATA", `Fetching monthly prayer data for ID: ${id}`);
    try {
      const response = await axios.get(`https://jadwalsholat.org/jadwal-sholat/monthly.php?id=${id}`, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const headers = $("tr.table_header > td").map(function() {
        return this._toSnakeCase($(this).text().trim());
      }.bind(this)).get();
      const jadwal = $("tr.table_light, tr.table_dark").map(function() {
        const data = {};
        $(this).children("td").each(function(index) {
          data[headers[index]] = $(this).text().trim().toLowerCase();
        });
        return data;
      }).get();
      this._log("FETCH_MONTHLY_DATA", `Retrieved ${jadwal.length} prayer schedule entries`, {
        entryCount: jadwal.length
      });
      return jadwal;
    } catch (error) {
      this._log("FETCH_MONTHLY_DATA_ERROR", "Error fetching monthly data", {
        error: error.message || error
      });
      throw new Error("Error fetching monthly data");
    }
  }
  async search({
    city,
    ...rest
  }) {
    const normalizedCity = this._toSnakeCase(city);
    this._log("SEARCH", `Searching for city: ${city}`, {
      normalizedCity: normalizedCity,
      rest: rest
    });
    if (!city) {
      this._log("SEARCH_ERROR", "City is required");
      throw new Error("City is required");
    }
    try {
      const cities = await this.getCitySelectOption();
      if (!cities.length) {
        this._log("SEARCH_ERROR", "No city options available");
        return null;
      }
      const matches = cities.map(c => ({
        ...c,
        similarity: this._calculateSimilarity(c.kota, city)
      })).filter(c => c.similarity >= .8).sort((a, b) => b.similarity - a.similarity);
      this._log("SEARCH", `Found ${matches.length} matching cities`, {
        matches: matches.map(m => ({
          kota: m.kota,
          id: m.id,
          slug: m.slug,
          similarity: m.similarity.toFixed(2)
        }))
      });
      if (!matches.length) {
        this._log("SEARCH", "No matching cities found");
        return null;
      }
      const bestMatch = matches[0];
      this._log("SEARCH", `Fetching prayer data for best match: ${bestMatch.kota}`, {
        id: bestMatch.id,
        slug: bestMatch.slug,
        similarity: bestMatch.similarity.toFixed(2)
      });
      const prayerData = await this.fetchMonthlyData(bestMatch.id);
      return {
        city: bestMatch.kota,
        id: bestMatch.id,
        slug: bestMatch.slug,
        similarity: bestMatch.similarity.toFixed(2),
        prayerData: prayerData
      };
    } catch (error) {
      this._log("SEARCH_ERROR", "Error during city search", {
        error: error.message || error
      });
      throw new Error("Error during city search");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.city) {
    return res.status(400).json({
      error: "city is required"
    });
  }
  try {
    const api = new JadwalSholat();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [HANDLER_ERROR] Internal Server Error`, error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}