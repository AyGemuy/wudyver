import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class CekOngkir {
  constructor() {
    this.baseUrl = "https://majoo.id";
    this.session = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.cookies = "";
    this.csrfToken = "";
  }
  async getCookiesAndCsrf() {
    try {
      const response = await this.session.get(this.baseUrl);
      this.cookies = response.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";
      const $ = cheerio.load(response.data);
      this.csrfToken = $('input[name="majoo_portal_csrf"]').attr("value");
      if (!this.csrfToken) throw new Error("csrf token tidak ditemukan");
      return {
        cookies: this.cookies,
        csrfToken: this.csrfToken
      };
    } catch (error) {
      throw new Error("gagal mengambil data: " + error.message);
    }
  }
  async cekOngkir({
    origin_province,
    origin_city,
    origin_region,
    destination_province,
    destination_city,
    destination_region
  }) {
    if (!this.cookies || !this.csrfToken) await this.getCookiesAndCsrf();
    const formData = new FormData();
    formData.append("majoo_portal_csrf", this.csrfToken);
    formData.append("origin_province", origin_province || "28");
    formData.append("origin_city", origin_city || "132");
    formData.append("origin_region", origin_region || "1810");
    formData.append("destination_province", destination_province || "8");
    formData.append("destination_city", destination_city || "156");
    formData.append("destination_region", destination_region || "2131");
    const headers = {
      ...formData.headers,
      cookie: this.cookies,
      accept: "*/*",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/business-tools/cek-ongkir`,
      "x-requested-with": "XMLHttpRequest"
    };
    const response = await this.session.post("/api/business-tools/cek-ongkir", formData, {
      headers: headers
    });
    return response.data;
  }
  async getCities({
    input: province = 1
  }) {
    if (!this.cookies || !this.csrfToken) await this.getCookiesAndCsrf();
    const response = await this.session.get(`/api/business-tools/city?province=${province}`, {
      headers: {
        cookie: this.cookies,
        accept: "*/*",
        referer: `${this.baseUrl}/business-tools/cek-ongkir`,
        "x-requested-with": "XMLHttpRequest"
      }
    });
    return response.data;
  }
  async getRegions({
    input: city = 1
  }) {
    if (!this.cookies || !this.csrfToken) await this.getCookiesAndCsrf();
    const response = await this.session.get(`/api/business-tools/region?city=${city}`, {
      headers: {
        cookie: this.cookies,
        accept: "*/*",
        referer: `${this.baseUrl}/business-tools/cek-ongkir`,
        "x-requested-with": "XMLHttpRequest"
      }
    });
    return response.data;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const cekOngkir = new CekOngkir();
  try {
    let data;
    switch (action) {
      case "city":
        if (!params.input) {
          return res.status(400).json({
            error: "Silakan masukkan input area."
          });
        }
        data = await cekOngkir.getCities(params);
        return res.status(200).json(data);
      case "region":
        if (!params.input) {
          return res.status(400).json({
            error: "Silakan masukkan input area."
          });
        }
        data = await cekOngkir.getRegions(params);
        return res.status(200).json(data);
      case "check":
        const requiredParams = ["origin_province", "origin_city", "origin_region", "destination_province", "destination_city", "destination_region"];
        const missingParams = requiredParams.filter(param => !params[param]);
        if (missingParams.length) {
          return res.status(400).json({
            error: `Silakan masukkan ${missingParams.join(", ")}.`
          });
        }
        data = await cekOngkir.cekOngkir(params);
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Aksi yang diminta tidak valid.",
          availableActions: ["city", "region", "check"]
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan."
    });
  }
}