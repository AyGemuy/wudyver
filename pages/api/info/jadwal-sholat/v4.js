import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class KemenagPrayer {
  constructor() {
    console.log("[Init] Creating axios instance with cookie jar");
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.base = "https://bimasislam.kemenag.go.id";
    this.headers = {
      "accept-language": "id-ID",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  toSnakeCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
  }
  async search({
    prov,
    kab,
    month = new Date().getMonth() + 1,
    year = new Date().getFullYear(),
    ...rest
  }) {
    const normalizedProv = this.toSnakeCase(prov);
    const normalizedKab = this.toSnakeCase(kab);
    console.log(`[Search] Province: ${prov || "all"} (normalized: ${normalizedProv}), City: ${kab || "all"} (normalized: ${normalizedKab}), ${month}/${year}`);
    if (month < 1 || month > 12) {
      console.error("[Search] Invalid month: must be between 1 and 12");
      return {
        error: "Invalid month: must be between 1 and 12",
        provinces: [],
        cities: [],
        data: []
      };
    }
    if (year < 1900 || year > 2100) {
      console.error("[Search] Invalid year: must be between 1900 and 2100");
      return {
        error: "Invalid year: must be between 1900 and 2100",
        provinces: [],
        cities: [],
        data: []
      };
    }
    try {
      console.log("[Search] Step 1: Initializing session");
      await this.client.get(`${this.base}/jadwalshalat`, {
        headers: {
          ...this.headers,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      console.log("[Search] Step 2: Getting provinces list");
      const provs = await this.provs();
      if (!provs?.length) {
        console.log("[Search] Failed to get provinces");
        return {
          error: "Failed to retrieve provinces list",
          provinces: [],
          cities: [],
          data: []
        };
      }
      console.log(`[Search] Found ${provs.length} provinces`);
      if (!prov) {
        console.log("[Search] No province specified, returning provinces list");
        return {
          error: "No province provided. Please select a province from the list below.",
          provinces: provs,
          cities: [],
          location: null,
          month: month,
          year: year,
          data: []
        };
      }
      const matchProv = provs.find(p => this.toSnakeCase(p.name)?.includes(normalizedProv) || p.value === prov);
      if (!matchProv) {
        console.log("[Search] Province not found");
        return {
          error: `Province "${prov}" not found. Please select a province from the list below.`,
          provinces: provs,
          cities: [],
          location: null,
          month: month,
          year: year,
          data: []
        };
      }
      const provId = matchProv.value;
      console.log(`[Search] Step 3: Getting cities for ${matchProv.name}`);
      const kabs = await this.cities(provId);
      if (!kabs?.length) {
        console.log("[Search] No cities found for province");
        return {
          error: `No cities found for province "${matchProv.name}".`,
          provinces: provs,
          cities: [],
          location: {
            province: matchProv.name,
            city: null
          },
          month: month,
          year: year,
          data: []
        };
      }
      let kabId = "";
      if (kab) {
        const matchKab = kabs.find(k => this.toSnakeCase(k.name)?.includes(normalizedKab) || k.value === kab);
        if (matchKab) {
          kabId = matchKab.value;
        } else {
          console.log("[Search] City not found, defaulting if possible");
          return {
            error: `City "${kab}" not found in province "${matchProv.name}". Please select a city from the list below.`,
            provinces: provs,
            cities: kabs,
            location: {
              province: matchProv.name,
              city: null
            },
            month: month,
            year: year,
            data: []
          };
        }
      }
      if (!kabId && kabs.length > 0) {
        const defaultKab = kabs.find(k => this.toSnakeCase(k.name).includes("kota")) || kabs[0];
        kabId = defaultKab.value;
        console.log(`[Search] No city specified or found, defaulting to ${defaultKab.name}`);
      }
      if (!kabId) {
        console.log("[Search] No valid city ID");
        return {
          error: `No valid city found for province "${matchProv.name}". Please select a city from the list below.`,
          provinces: provs,
          cities: kabs,
          location: {
            province: matchProv.name,
            city: null
          },
          month: month,
          year: year,
          data: []
        };
      }
      console.log("[Search] Step 4: Fetching prayer times");
      const m = month;
      const y = year;
      const {
        data: result
      } = await this.client.post(`${this.base}/ajax/getShalatbln`, `x=${provId}&y=${kabId}&bln=${m}&thn=${y}`, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      console.log("[Search] Raw API response:", JSON.stringify(result, null, 2));
      if (!result?.status || result.status !== 1) {
        console.log("[Search] No data found or invalid response status");
        return {
          error: "No prayer time data found for the specified location and date.",
          provinces: provs,
          cities: kabs,
          location: {
            province: matchProv.name,
            city: kabs.find(k => k.value === kabId)?.name || null
          },
          month: m,
          year: y,
          data: []
        };
      }
      let prayerData = [];
      if (Array.isArray(result.data)) {
        prayerData = result.data.map(d => ({
          date: d.tanggal || null,
          imsak: d.imsak || null,
          fajr: d.subuh || null,
          sunrise: d.terbit || null,
          dhuha: d.dhuha || null,
          dhuhr: d.dzuhur || null,
          asr: d.ashar || null,
          maghrib: d.maghrib || null,
          isha: d.isya || null
        }));
      } else if (result.data && typeof result.data === "object") {
        console.log("[Search] Converting object-based data to array");
        prayerData = Object.keys(result.data).map(date => ({
          date: result.data[date].tanggal || date,
          imsak: result.data[date].imsak || null,
          fajr: result.data[date].subuh || null,
          sunrise: result.data[date].terbit || null,
          dhuha: result.data[date].dhuha || null,
          dhuhr: result.data[date].dzuhur || null,
          asr: result.data[date].ashar || null,
          maghrib: result.data[date].maghrib || null,
          isha: result.data[date].isya || null
        }));
      } else {
        console.error("[Search] Error: result.data is not an array or object, received:", result.data);
        return {
          error: "Invalid prayer time data format received from API.",
          provinces: provs,
          cities: kabs,
          location: {
            province: matchProv.name,
            city: kabs.find(k => k.value === kabId)?.name || null
          },
          month: m,
          year: y,
          data: []
        };
      }
      console.log(`[Search] Complete: ${prayerData.length} days`);
      return {
        error: null,
        provinces: provs,
        cities: kabs,
        location: {
          province: matchProv.name,
          city: kabs.find(k => k.value === kabId)?.name || null
        },
        month: m,
        year: y,
        data: prayerData
      };
    } catch (err) {
      console.error("[Search] Error:", err?.message || err);
      return {
        error: `Failed to fetch data: ${err.message}`,
        provinces: [],
        cities: [],
        data: []
      };
    }
  }
  async provs() {
    console.log("[Provs] Getting provinces list");
    try {
      const {
        data: html
      } = await this.client.get(`${this.base}/jadwalshalat`, {
        headers: {
          ...this.headers,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const $ = cheerio.load(html);
      const list = [];
      $("#search_prov option").each((i, el) => {
        const val = $(el).attr("value");
        const name = $(el).text()?.trim();
        if (val && name && name !== "PILIH PROVINSI") {
          list.push({
            value: val,
            name: name
          });
        }
      });
      console.log(`[Provs] Found ${list.length} provinces`);
      return list;
    } catch (err) {
      console.error("[Provs] Error:", err?.message || err);
      return [];
    }
  }
  async cities(prov) {
    console.log(`[Cities] Getting cities for province: ${prov}`);
    try {
      const {
        data: html
      } = await this.client.post(`${this.base}/ajax/getKabkoshalat`, `x=${prov}`, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const $ = cheerio.load(html || "");
      const list = [];
      $("option").each((i, el) => {
        const val = $(el).attr("value");
        const name = $(el).text()?.trim();
        if (val && name) {
          list.push({
            value: val,
            name: name
          });
        }
      });
      console.log(`[Cities] Found ${list.length} cities`);
      return list;
    } catch (err) {
      console.error("[Cities] Error:", err?.message || err);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prov || !params.kab) {
    return res.status(400).json({
      error: "Paramenter 'prov' dan 'kab' wajib diisi untuk action 'search'."
    });
  }
  try {
    const api = new KemenagPrayer();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}