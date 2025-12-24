import axios from "axios";
import * as cheerio from "cheerio";
import {
  URLSearchParams
} from "url";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class BansosCrawler {
  constructor() {
    this.jar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://cekbansos.kemensos.go.id",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"'
      },
      validateStatus: () => true
    }));
  }
  toSnakeCase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.toSnakeCase(item));
    } else if (obj !== null && typeof obj === "object") {
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        let snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (snakeKey.startsWith("_")) snakeKey = snakeKey.substring(1);
        snakeKey = snakeKey.replace(/__/g, "_");
        converted[snakeKey] = this.toSnakeCase(value);
      }
      return converted;
    }
    return obj;
  }
  async getCsrfAndCaptcha() {
    console.log("[PROSES] Getting CSRF token and CAPTCHA details...");
    const htmlResponse = await this.axiosInstance.get("/");
    const $ = cheerio.load(htmlResponse.data);
    const csrfToken = $('meta[name="csrf-token"]').attr("content");
    const captchaSrc = $("#captchaCode").attr("src");
    let captchaImageUrl = captchaSrc ? new URL(captchaSrc, this.axiosInstance.defaults.baseURL).href : "";
    let captchaText = "";
    console.log(`[CSRF] Token found: ${csrfToken ? "Yes" : "No"}`);
    console.log(`[CAPTCHA] Image URL from web: ${captchaImageUrl}`);
    if (captchaImageUrl) {
      try {
        console.log("[PROSES] Downloading CAPTCHA image...");
        const captchaResponse = await this.axiosInstance.get(captchaImageUrl, {
          responseType: "arraybuffer"
        });
        const captchaBuffer = Buffer.from(captchaResponse.data);
        console.log("[PROSES] Uploading CAPTCHA image...");
        const formData = new FormData();
        formData.append("file", captchaBuffer, {
          filename: "captcha.png",
          contentType: "image/png"
        });
        formData.append("filename", "");
        formData.append("expire_value", "24");
        formData.append("expire_unit", "");
        const uploadResponse = await axios.post("https://nauval.cloud/upload", formData, {
          headers: {
            ...formData.getHeaders(),
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        console.log("[API_RESP] Upload:", JSON.stringify(uploadResponse.data).substring(0, 100) + "...");
        if (uploadResponse.data?.file_url) {
          const captchaImageUrlFromUpload = uploadResponse.data.file_url;
          console.log(`[CAPTCHA] Image uploaded to: ${captchaImageUrlFromUpload}`);
          console.log("[PROSES] Sending CAPTCHA image to OCR API...");
          const ocrApiUrl = `https://api.nekorinn.my.id/tools/ocr?imageUrl=${encodeURIComponent(captchaImageUrlFromUpload)}`;
          const ocrResponse = await axios.get(ocrApiUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
            }
          });
          console.log("[API_RESP] OCR Captcha:", JSON.stringify(ocrResponse.data).substring(0, 100) + "...");
          if (ocrResponse.data?.result) {
            captchaText = ocrResponse.data.result.replace(/\s+/g, "").toLowerCase();
            console.log(`[CAPTCHA] Text from OCR (lowercase): '${captchaText}'`);
          } else {
            console.warn("[WARN] OCR API did not return CAPTCHA text.");
          }
        } else {
          console.warn("[WARN] Image upload failed or returned no result.");
        }
      } catch (ocrError) {
        console.error(`[ERR] Failed to process CAPTCHA: ${ocrError.message}`);
      }
    } else {
      console.warn("[WARN] CAPTCHA image URL not found.");
    }
    return {
      csrfToken: csrfToken,
      captchaSrc: captchaImageUrl,
      captchaText: captchaText
    };
  }
  async getProvinces(csrfToken) {
    console.log("[PROSES] Fetching provinces...");
    const headers = {
      Accept: "*/*",
      "Content-Length": "0",
      Origin: this.axiosInstance.defaults.baseURL,
      Referer: `${this.axiosInstance.defaults.baseURL}/`,
      "X-CSRF-Token": csrfToken,
      "X-Requested-With": "XMLHttpRequest"
    };
    const response = await this.axiosInstance.post("/provinsi", {}, {
      headers: headers
    });
    const $ = cheerio.load(response.data);
    const provinces = [];
    $("option").each((i, el) => {
      const value = $(el).attr("value");
      const text = $(el).text();
      if (value && text !== "=== Pilih Provinsi ===") {
        provinces.push({
          code: value,
          name: text
        });
      }
    });
    console.log(`[RESULT] Provinces fetched: ${provinces.length} data.`);
    console.log("[API_RESP] /provinsi:", JSON.stringify(response.data).substring(0, 100) + "...");
    return provinces;
  }
  async getRegencies(csrfToken, kdprop) {
    console.log(`[PROSES] Fetching regencies for province ${kdprop}...`);
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: this.axiosInstance.defaults.baseURL,
      Referer: `${this.axiosInstance.defaults.baseURL}/`,
      "X-CSRF-Token": csrfToken,
      "X-Requested-With": "XMLHttpRequest"
    };
    const requestData = `kdprop=${kdprop}`;
    const response = await this.axiosInstance.post("/kabupaten", requestData, {
      headers: headers
    });
    let regenciesData = [];
    try {
      if (typeof response.data === "string") {
        const jsonMatch = response.data.match(/{.*}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.Data) {
            regenciesData = parsed.Data.map(item => ({
              KODE_KABUPATEN: item.KODE_KABUPATEN,
              NAMA_KABUPATEN: item.NAMA_KABUPATEN
            }));
          }
        } else {
          const $ = cheerio.load(response.data);
          $("option").each((i, el) => {
            const value = $(el).attr("value");
            const text = $(el).text();
            if (value && text !== "=== Pilih Kab/kota ===") {
              regenciesData.push({
                KODE_KABUPATEN: value,
                NAMA_KABUPATEN: text
              });
            }
          });
        }
      } else if (response.data?.Data) {
        regenciesData = response.data.Data.map(item => ({
          KODE_KABUPATEN: item.KODE_KABUPATEN,
          NAMA_KABUPATEN: item.NAMA_KABUPATEN
        }));
      }
    } catch (e) {
      console.error(`[ERR] Failed to parse /kabupaten response: ${e.message}`);
    }
    console.log(`[RESULT] Regencies fetched: ${regenciesData.length} data.`);
    console.log("[API_RESP] /kabupaten:", JSON.stringify(response.data).substring(0, 100) + "...");
    return regenciesData;
  }
  async getDistricts(csrfToken, kdprop, kdkab) {
    console.log(`[PROSES] Fetching districts for regency ${kdkab}...`);
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: this.axiosInstance.defaults.baseURL,
      Referer: `${this.axiosInstance.defaults.baseURL}/`,
      "X-CSRF-Token": csrfToken,
      "X-Requested-With": "XMLHttpRequest"
    };
    const requestData = `kdprop=${kdprop}&kdkab=${kdkab}`;
    const response = await this.axiosInstance.post("/kecamatan", requestData, {
      headers: headers
    });
    const $ = cheerio.load(response.data);
    const districts = [];
    $("option").each((i, el) => {
      const value = $(el).attr("value");
      const text = $(el).text();
      if (value && text !== "=== Pilih Kecamatan ===") {
        districts.push({
          code: value,
          name: text
        });
      }
    });
    console.log(`[RESULT] Districts fetched: ${districts.length} data.`);
    console.log("[API_RESP] /kecamatan:", JSON.stringify(response.data).substring(0, 100) + "...");
    return districts;
  }
  async getVillages(csrfToken, kdprop, kdkab, kdkec) {
    console.log(`[PROSES] Fetching villages for district ${kdkec}...`);
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: this.axiosInstance.defaults.baseURL,
      Referer: `${this.axiosInstance.defaults.baseURL}/`,
      "X-CSRF-Token": csrfToken,
      "X-Requested-With": "XMLHttpRequest"
    };
    const requestData = `kdprop=${kdprop}&kdkab=${kdkab}&kdkec=${kdkec}`;
    const response = await this.axiosInstance.post("/desa", requestData, {
      headers: headers
    });
    const $ = cheerio.load(response.data);
    const villages = [];
    $("option").each((i, el) => {
      const value = $(el).attr("value");
      const text = $(el).text();
      if (value && text !== "=== Pilih Desa ===" && value !== "0") {
        villages.push({
          code: value,
          name: text
        });
      }
    });
    console.log(`[RESULT] Villages fetched: ${villages.length} data.`);
    console.log("[API_RESP] /desa:", JSON.stringify(response.data).substring(0, 100) + "...");
    return villages;
  }
  async searchBansos({
    csrfToken,
    name,
    villageCode,
    captcha
  }) {
    console.log("[PROSES] Sending bansos search request...");
    const headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: this.axiosInstance.defaults.baseURL,
      Referer: `${this.axiosInstance.defaults.baseURL}/`,
      "X-CSRF-Token": csrfToken,
      "X-Requested-With": "XMLHttpRequest"
    };
    const requestBody = new URLSearchParams({
      nama_input: name,
      wilayah_input: villageCode,
      captcha: captcha
    }).toString();
    const searchResponse = await this.axiosInstance.post("/cekbansos_v2", requestBody, {
      headers: headers
    });
    console.log(`[RESULT] Bansos search status: ${searchResponse.status}`);
    console.log("[API_RESP] /cekbansos_v2:", JSON.stringify(searchResponse.data).substring(0, 100) + "...");
    return searchResponse.data;
  }
  findMatch(apiData, targetName, targetRegion) {
    if (!apiData?.length) return null;
    const cleanTargetName = targetName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedTargetProvince = targetRegion.province.name.toLowerCase();
    const normalizedTargetRegency = targetRegion.regency.name.toLowerCase();
    const normalizedTargetDistrict = targetRegion.district.name.toLowerCase();
    const normalizedTargetVillage = targetRegion.village.name.toLowerCase();
    let bestMatch = null;
    let highestScore = -1;
    for (const item of apiData) {
      const itemConverted = this.toSnakeCase(item);
      const itemName = itemConverted.nama_penerima ? itemConverted.nama_penerima.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
      const itemProvince = itemConverted.provinsi ? itemConverted.provinsi.toLowerCase() : "";
      const itemRegency = itemConverted.kabupaten ? itemConverted.kabupaten.toLowerCase() : "";
      const itemDistrict = itemConverted.kecamatan ? itemConverted.kecamatan.toLowerCase() : "";
      const itemVillage = itemConverted.kelurahan ? itemConverted.kelurahan.toLowerCase() : "";
      let currentScore = 0;
      if (itemName === cleanTargetName) {
        currentScore += 100;
      } else if (itemName.includes(cleanTargetName) || cleanTargetName.includes(itemName)) {
        currentScore += 50;
      }
      if (itemProvince.includes(normalizedTargetProvince)) currentScore += 20;
      if (itemRegency.includes(normalizedTargetRegency)) currentScore += 15;
      if (itemDistrict.includes(normalizedTargetDistrict)) currentScore += 10;
      if (itemVillage.includes(normalizedTargetVillage)) currentScore += 5;
      if (currentScore > highestScore) {
        highestScore = currentScore;
        bestMatch = itemConverted;
      }
    }
    if (bestMatch && highestScore >= 100) {
      console.log(`[PROSES] Best matching bansos data found (score: ${highestScore}).`);
      return bestMatch;
    } else {
      console.log(`[WARN] No strong match found in API response (best score: ${highestScore}).`);
      return null;
    }
  }
  findLocationByName(locations, targetName) {
    if (!locations?.length || !targetName) return null;
    const cleanTarget = targetName.toLowerCase().trim();
    let match = locations.find(item => item.name.toLowerCase().trim() === cleanTarget);
    if (match) return match;
    match = locations.find(item => item.name.toLowerCase().includes(cleanTarget) || cleanTarget.includes(item.name.toLowerCase()));
    return match;
  }
  async search({
    prov,
    kab,
    kec,
    desa,
    nama
  }) {
    console.log(`\n--- Starting Search ---`);
    console.log(`[INPUT] Province: ${prov}, Regency: ${kab}, District: ${kec}, Village: ${desa}, Name: ${nama}`);
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[ATTEMPT ${attempt}] Fetching initial data and solving CAPTCHA...`);
        const {
          csrfToken,
          captchaText
        } = await this.getCsrfAndCaptcha();
        if (!csrfToken) {
          throw new Error("[ERR] CSRF token not found. Cannot proceed.");
        }
        if (!captchaText) {
          console.warn("[WARN] No CAPTCHA text from API. Search likely to FAIL. Retrying...");
          continue;
        }
        console.log(`[INFO] CSRF Token: ${csrfToken.substring(0, 10)}..., Captcha Text: ${captchaText}`);
        const lowerProv = (prov || "").toLowerCase().trim();
        const lowerKab = (kab || "").toLowerCase().trim();
        const lowerKec = (kec || "").toLowerCase().trim();
        const lowerDesa = (desa || "").toLowerCase().trim();
        const provinces = await this.getProvinces(csrfToken);
        if (!lowerProv) {
          return {
            status: false,
            message: "Input Provinsi belum diisi. Silakan pilih dari daftar berikut:",
            available_data: provinces.map(p => ({
              code: p.code,
              name: p.name
            })),
            level: "province"
          };
        }
        const targetProvince = this.findLocationByName(provinces, lowerProv);
        if (!targetProvince) {
          console.error(`[ERR] Province '${prov}' not found or no close match.`);
          return {
            status: false,
            message: `Provinsi '${prov}' tidak ditemukan. Silakan pilih dari daftar berikut:`,
            available_data: provinces.map(p => ({
              code: p.code,
              name: p.name
            })),
            level: "province"
          };
        }
        console.log(`[SUCCESS] Found Province: ${targetProvince.name} (Code: ${targetProvince.code})`);
        const regencies = await this.getRegencies(csrfToken, targetProvince.code);
        const normalizedRegencies = regencies.map(r => ({
          code: r.KODE_KABUPATEN,
          name: r.NAMA_KABUPATEN
        }));
        if (!lowerKab) {
          return {
            status: false,
            message: `Input Kabupaten/Kota belum diisi untuk provinsi ${targetProvince.name}. Silakan pilih dari daftar berikut:`,
            available_data: normalizedRegencies.map(r => ({
              code: r.code,
              name: r.name
            })),
            level: "regency",
            parent_location: {
              province: targetProvince.name
            }
          };
        }
        const targetRegency = this.findLocationByName(normalizedRegencies, lowerKab);
        if (!targetRegency) {
          console.error(`[ERR] Regency '${kab}' not found or no close match in '${targetProvince.name}'.`);
          return {
            status: false,
            message: `Kabupaten/Kota '${kab}' tidak ditemukan di ${targetProvince.name}. Silakan pilih dari daftar berikut:`,
            available_data: normalizedRegencies.map(r => ({
              code: r.code,
              name: r.name
            })),
            level: "regency",
            parent_location: {
              province: targetProvince.name
            }
          };
        }
        console.log(`[SUCCESS] Found Regency: ${targetRegency.name} (Code: ${targetRegency.code})`);
        const districts = await this.getDistricts(csrfToken, targetProvince.code, targetRegency.code);
        if (!lowerKec) {
          return {
            status: false,
            message: `Input Kecamatan belum diisi untuk kabupaten ${targetRegency.name}. Silakan pilih dari daftar berikut:`,
            available_data: districts.map(d => ({
              code: d.code,
              name: d.name
            })),
            level: "district",
            parent_location: {
              province: targetProvince.name,
              regency: targetRegency.name
            }
          };
        }
        const targetDistrict = this.findLocationByName(districts, lowerKec);
        if (!targetDistrict) {
          console.error(`[ERR] District '${kec}' not found or no close match in '${targetRegency.name}'.`);
          return {
            status: false,
            message: `Kecamatan '${kec}' tidak ditemukan di ${targetRegency.name}. Silakan pilih dari daftar berikut:`,
            available_data: districts.map(d => ({
              code: d.code,
              name: d.name
            })),
            level: "district",
            parent_location: {
              province: targetProvince.name,
              regency: targetRegency.name
            }
          };
        }
        console.log(`[SUCCESS] Found District: ${targetDistrict.name} (Code: ${targetDistrict.code})`);
        const villages = await this.getVillages(csrfToken, targetProvince.code, targetRegency.code, targetDistrict.code);
        if (!lowerDesa) {
          return {
            status: false,
            message: `Input Desa/Kelurahan belum diisi untuk kecamatan ${targetDistrict.name}. Silakan pilih dari daftar berikut:`,
            available_data: villages.map(v => ({
              code: v.code,
              name: v.name
            })),
            level: "village",
            parent_location: {
              province: targetProvince.name,
              regency: targetRegency.name,
              district: targetDistrict.name
            }
          };
        }
        const targetVillage = this.findLocationByName(villages, lowerDesa);
        if (!targetVillage) {
          console.error(`[ERR] Village '${desa}' not found or no close match in '${targetDistrict.name}'.`);
          return {
            status: false,
            message: `Desa/Kelurahan '${desa}' tidak ditemukan di ${targetDistrict.name}. Silakan pilih dari daftar berikut:`,
            available_data: villages.map(v => ({
              code: v.code,
              name: v.name
            })),
            level: "village",
            parent_location: {
              province: targetProvince.name,
              regency: targetRegency.name,
              district: targetDistrict.name
            }
          };
        }
        console.log(`[SUCCESS] Found Village: ${targetVillage.name} (Code: ${targetVillage.code})`);
        if (!nama || nama.trim() === "") {
          return {
            status: false,
            message: "Input nama penerima belum diisi.",
            level: "name_required"
          };
        }
        const searchResult = await this.searchBansos({
          csrfToken: csrfToken,
          name: nama,
          villageCode: targetVillage.code,
          captcha: captchaText
        });
        const convertedFullResult = this.toSnakeCase(searchResult);
        if (convertedFullResult.status === false) {
          console.warn(`[API REJECTION] Message from Kemensos API: ${convertedFullResult.message}`);
          if (convertedFullResult.message && convertedFullResult.message.includes("Captcha")) {
            console.warn(`[ATTEMPT ${attempt}] Captcha error detected by API, retrying...`);
            continue;
          }
          return {
            status: false,
            message: convertedFullResult.message || "Terjadi kesalahan saat mencari (API merespons dengan status false).",
            data: convertedFullResult.data || [],
            matched: null
          };
        }
        let matchedBansosData = null;
        if (convertedFullResult.data?.length) {
          console.log("[PROSES] Searching for best matching bansos data by name and region...");
          matchedBansosData = this.findMatch(convertedFullResult.data, nama, {
            province: {
              name: targetProvince.name
            },
            regency: {
              name: targetRegency.name
            },
            district: {
              name: targetDistrict.name
            },
            village: {
              name: targetVillage.name
            }
          });
        } else {
          console.log("[INFO] API response contained no bansos data for the given criteria.");
        }
        return {
          status: true,
          message: searchResult.message || "Pencarian selesai.",
          data: convertedFullResult.data || [],
          matched: matchedBansosData,
          found_location: {
            province: targetProvince,
            regency: targetRegency,
            district: targetDistrict,
            village: targetVillage
          }
        };
      } catch (error) {
        console.error(`[ATTEMPT ${attempt}] An unexpected error occurred: ${error.message}`);
        if (attempt === MAX_ATTEMPTS) {
          return {
            status: false,
            message: `Pencarian gagal setelah ${MAX_ATTEMPTS} percobaan karena kesalahan tak terduga: ${error.message}`,
            data: [],
            matched: null
          };
        }
        await new Promise(resolve => setTimeout(resolve, 2e3));
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const crawler = new BansosCrawler();
    const response = await crawler.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Terjadi kesalahan server internal.",
      data: [],
      matched: null
    });
  }
}