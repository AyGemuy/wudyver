import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const DEFAULT_HEADERS = {
  "accept-language": "id-ID",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"'
};
const PRAYER_NAME_MAP = {
  subuh: "fajr",
  "matahari terbit": "sunrise",
  dzuhur: "dhuhr",
  ashar: "asr",
  magrib: "maghrib",
  isya: "isha"
};
class IslamicFinder {
  constructor() {
    this._log("INIT", "Initializing IslamicFinder with axios and cookie jar");
    this.base = "https://www.islamicfinder.org";
    this.client = this._initClient();
  }
  _log(context, message, data = {}) {
    const timestamp = new Date().toISOString();
    const formattedData = Object.keys(data).length ? ` | Data: ${JSON.stringify(data)}` : "";
    console.log(`[${timestamp}] [${context}] ${message}${formattedData}`);
  }
  _initClient() {
    const jar = new CookieJar();
    return wrapper(axios.create({
      jar: jar
    }));
  }
  utils = {
    toSnakeCase: str => {
      if (!str) return "";
      return str.toLowerCase().replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
    },
    similarity: (str1, str2) => {
      if (!str1 || !str2) return 0;
      str1 = this.utils.toSnakeCase(str1);
      str2 = this.utils.toSnakeCase(str2);
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
    },
    tz: offset => {
      const absOffset = Math.abs(offset);
      const hours = Math.floor(absOffset / 60);
      const mins = absOffset % 60;
      const sign = offset > 0 ? "-" : "+";
      return `${sign}${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    },
    key: name => {
      return PRAYER_NAME_MAP[name?.toLowerCase()] || this.utils.toSnakeCase(name);
    }
  };
  async searchCity({
    city,
    ...rest
  }) {
    const normalizedCity = this.utils.toSnakeCase(city);
    this._log("SEARCH_CITY", `Searching for city: ${city}`, {
      normalized: normalizedCity
    });
    try {
      const {
        data
      } = await this.client.get(`${this.base}/world/global-search`, {
        params: {
          cityOnly: 1,
          keyword: normalizedCity,
          ...rest
        },
        headers: {
          ...DEFAULT_HEADERS,
          accept: "application/json, text/javascript, */*; q=0.01",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      this._log("SEARCH_CITY", `Found ${data?.length || 0} results`, {
        resultCount: data?.length || 0
      });
      return data ? data.map(item => ({
        ...item,
        normalizedTitle: this.utils.toSnakeCase(item.title),
        normalizedSubDivision1Name: this.utils.toSnakeCase(item.subDivision1Name)
      })) : [];
    } catch (err) {
      this._log("SEARCH_CITY_ERROR", "Error during search", {
        error: err?.message || err
      });
      return [];
    }
  }
  async geocode({
    lat,
    lng,
    city,
    country,
    state,
    iso
  }) {
    const normalizedCity = this.utils.toSnakeCase(city);
    const normalizedState = this.utils.toSnakeCase(state);
    this._log("GEOCODE", `Processing geocode for: ${city}, ${state}, ${country}`, {
      normalizedCity: normalizedCity,
      normalizedState: normalizedState,
      country: country
    });
    try {
      const tz = this.utils.tz(new Date().getTimezoneOffset());
      const {
        data
      } = await this.client.get(`${this.base}/world/geocode-location`, {
        params: {
          city: normalizedCity,
          country: country,
          timezone: tz,
          subdivision: normalizedState,
          countryIso: iso,
          lng: lng,
          lat: lat
        },
        headers: DEFAULT_HEADERS
      });
      this._log("GEOCODE", "Geocode completed successfully");
      return data;
    } catch (err) {
      this._log("GEOCODE_ERROR", "Error during geocoding", {
        error: err?.message || err
      });
      return null;
    }
  }
  async fetchPrayerTimes({
    id,
    slug,
    country,
    lang = "id"
  }) {
    this._log("FETCH_PRAYER_TIMES", `Fetching prayer times for ID: ${id}`, {
      slug: slug,
      country: country
    });
    try {
      const cSlug = this.utils.toSnakeCase(country) || "indonesia";
      const url = `${this.base}/world/${cSlug}/${id}/${slug}-prayer-times/`;
      const {
        data: html
      } = await this.client.get(url, {
        params: {
          language: lang
        },
        headers: {
          ...DEFAULT_HEADERS,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      this._log("FETCH_PRAYER_TIMES", "HTML fetched, starting parse");
      return this._parseHTML(html);
    } catch (err) {
      this._log("FETCH_PRAYER_TIMES_ERROR", "Error fetching prayer times", {
        error: err?.message || err
      });
      return null;
    }
  }
  _parseHTML(html) {
    const $ = cheerio.load(html);
    const card = $("#prayertimes-card");
    const loc = card.find(".boxCard-title")?.text()?.trim()?.replace(/jadwal sholat di\s*/i, "") || null;
    const date = card.find(".pt-date p").first()?.text()?.trim() || null;
    const hijri = card.find(".pt-date-right")?.text()?.trim() || null;
    const times = {};
    card.find(".prayerTiles").each((i, el) => {
      const name = $(el).find(".prayername")?.text()?.trim()?.split("\n")[0] || null;
      const time = $(el).find(".prayertime")?.text()?.trim() || null;
      if (name && time) {
        const key = this.utils.key(name);
        times[key] = time;
      }
    });
    const method = card.find(".pt-info p").first()?.text()?.trim() || null;
    const calc = card.find(".pt-info p").last()?.text()?.trim() || null;
    this._log("PARSE_HTML", `Extracted prayer times for location: ${loc || "Unknown"}`, {
      location: loc,
      date: date,
      hijriDate: hijri,
      prayerTimes: Object.keys(times).length
    });
    return {
      location: loc,
      date: date,
      hijriDate: hijri,
      prayerTimes: times,
      method: method,
      calculation: calc
    };
  }
  async search({
    id,
    city,
    country = "Indonesia",
    state = null,
    slug = null
  }) {
    const normalizedCity = this.utils.toSnakeCase(city);
    const normalizedState = this.utils.toSnakeCase(state);
    this._log("FIND", "Starting prayer time search", {
      id: id || "Not provided",
      city: city || "Not provided",
      normalizedCity: normalizedCity,
      country: country,
      state: state || "Not provided",
      normalizedState: normalizedState
    });
    if (id) {
      this._log("FIND", `Using provided ID: ${id}`);
      return await this.fetchPrayerTimes({
        id: id,
        slug: slug || this.utils.toSnakeCase(city) || "unknown",
        country: country
      });
    }
    if (!city) {
      this._log("FIND_ERROR", "City or ID must be provided");
      return null;
    }
    this._log("FIND", `Searching for city: ${city}, country: ${country}`, {
      normalizedCity: normalizedCity,
      state: state || "Not provided",
      normalizedState: normalizedState
    });
    const results = await this.searchCity({
      city: city
    });
    if (!results?.length) {
      this._log("FIND", "No search results found");
      return null;
    }
    const normalizedCountry = this.utils.toSnakeCase(country);
    let matches = results.filter(r => this.utils.toSnakeCase(r?.countryName) === normalizedCountry).map(r => ({
      ...r,
      citySimilarity: this.utils.similarity(r.title, city),
      stateSimilarity: normalizedState ? this.utils.similarity(r.subDivision1Name, state) : 1
    })).sort((a, b) => {
      if (a.citySimilarity === 1 && b.citySimilarity !== 1) return -1;
      if (b.citySimilarity === 1 && a.citySimilarity !== 1) return 1;
      return b.citySimilarity + b.stateSimilarity - (a.citySimilarity + a.stateSimilarity);
    });
    this._log("FIND", `Found ${matches.length} matching results in ${country}`, {
      matches: matches.map(m => ({
        cityDetail: m.cityDetail,
        citySimilarity: m.citySimilarity.toFixed(2),
        stateSimilarity: m.stateSimilarity.toFixed(2)
      }))
    });
    if (!matches.length) {
      matches = results.map(r => ({
        ...r,
        citySimilarity: this.utils.similarity(r.title, city),
        stateSimilarity: normalizedState ? this.utils.similarity(r.subDivision1Name, state) : 1
      })).sort((a, b) => b.citySimilarity + b.stateSimilarity - (a.citySimilarity + a.stateSimilarity));
      this._log("FIND", `No matches in ${country}, falling back to ${matches.length} results`, {
        matches: matches.map(m => ({
          cityDetail: m.cityDetail,
          citySimilarity: m.citySimilarity.toFixed(2),
          stateSimilarity: m.stateSimilarity.toFixed(2)
        }))
      });
    }
    const bestMatch = matches[0];
    if (!bestMatch) {
      this._log("FIND", "No matching location found");
      return null;
    }
    this._log("FIND", `Best match found: ${bestMatch.title}`, {
      id: bestMatch.id,
      location: bestMatch.cityDetail,
      citySimilarity: bestMatch.citySimilarity.toFixed(2),
      stateSimilarity: bestMatch.stateSimilarity.toFixed(2)
    });
    return await this.fetchPrayerTimes({
      id: bestMatch.id,
      slug: bestMatch.slug || this.utils.toSnakeCase(bestMatch.title) || "unknown",
      country: bestMatch.countryName
    });
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
    const api = new IslamicFinder();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [HANDLER_ERROR] Internal Server Error`, error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}