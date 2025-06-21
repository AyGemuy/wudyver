import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class MajooResi {
  constructor() {
    this.baseUrl = "https://majoo.id/business-tools/cek-resi";
    this.apiUrl = "https://majoo.id/api/business-tools/cek-resi";
    this.session = axios.create({
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID,id;q=0.9",
        referer: "https://www.google.com/"
      }
    });
  }
  async getCookiesAndCsrf() {
    try {
      console.log("[INFO] Mengambil cookies dan CSRF token...");
      const response = await this.session.get(this.baseUrl);
      const cookies = response.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";
      console.log("[DEBUG] Cookies:", cookies);
      const $ = cheerio.load(response.data);
      const csrfToken = $('input[name="majoo_portal_csrf"]').attr("value");
      if (!csrfToken) {
        console.error("[ERROR] CSRF token tidak ditemukan.");
        throw new Error("CSRF token tidak ditemukan");
      }
      console.log("[DEBUG] CSRF Token:", csrfToken);
      return {
        cookies: cookies,
        csrfToken: csrfToken
      };
    } catch (error) {
      console.error("[ERROR] Gagal mengambil data:", error.message);
      throw new Error("Gagal mengambil data: " + error.message);
    }
  }
  async getExpedisi() {
    try {
      console.log("[INFO] Mengambil daftar ekspedisi...");
      const response = await this.session.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      const expedisi = [];
      $('select[name="vendor"] option').each((_, el) => {
        const value = $(el).attr("value");
        const name = $(el).text().trim();
        if (value && name && value !== "") {
          expedisi.push({
            expedisi: value,
            name: name
          });
        }
      });
      console.log("[DEBUG] Daftar ekspedisi:", expedisi);
      return {
        list: expedisi
      };
    } catch (error) {
      console.error("[ERROR] Gagal mengambil daftar ekspedisi:", error.message);
      throw new Error("Gagal mengambil daftar ekspedisi: " + error.message);
    }
  }
  async cekResi({
    expedisi: vendor = "jnt",
    resi: nomorResi = "JX3708794672"
  }) {
    try {
      console.log(`[INFO] Mengecek resi: Vendor=${vendor}, Resi=${nomorResi}`);
      const {
        cookies,
        csrfToken
      } = await this.getCookiesAndCsrf();
      const form = new FormData();
      form.append("majoo_portal_csrf", csrfToken);
      form.append("vendor", vendor);
      form.append("nomor_resi", nomorResi);
      console.log("[INFO] Mengirim request cek resi...");
      const response = await this.session.post(this.apiUrl, form, {
        headers: {
          ...form.headers,
          cookie: cookies
        }
      });
      console.log("[INFO] Respon diterima:", response.data);
      return response.data;
    } catch (error) {
      console.error("[ERROR] Gagal cek resi:", error.message);
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const majoo = new MajooResi();
  try {
    let data;
    switch (action) {
      case "check":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        if (!params.expedisi) {
          data = await majoo.getExpedisi();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await majoo.cekResi(params);
        return res.status(200).json(data);
      case "list":
        data = await majoo.getExpedisi();
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Aksi yang diminta tidak valid.",
          availableActions: ["check", "list"]
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan."
    });
  }
}