import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
class CekResi {
  constructor() {
    this.baseUrl = "https://www.cekidot.id/cek-resi";
    this.headers = {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      referer: "https://www.cekidot.id/cek-resi"
    };
  }
  async getTokenAndCookie() {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const token = $('input[name="_token"]').val();
      const cookies = response.headers["set-cookie"].map(cookie => cookie.split(";")[0]).join("; ");
      return {
        token: token,
        cookies: cookies
      };
    } catch (error) {
      console.error("gagal mengambil token dan cookie:", error.message);
      return null;
    }
  }
  async cekResi({
    resi = "JX3708794672",
    expedisi: courier = "jnt"
  }) {
    try {
      const session = await this.getTokenAndCookie();
      if (!session) throw new Error("gagal mendapatkan token dan cookie.");
      const data = qs.stringify({
        _token: session.token,
        resi: resi,
        courier: courier
      });
      const response = await axios.post(this.baseUrl, data, {
        headers: {
          ...this.headers,
          cookie: session.cookies
        }
      });
      return this.parseResi(response.data);
    } catch (error) {
      console.error("error:", error.message);
      return null;
    }
  }
  async expedisiList() {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: this.headers
      });
      return this.parseList(response.data);
    } catch (error) {
      console.error("gagal mengambil token dan cookie:", error.message);
      return null;
    }
  }
  parseResi(html) {
    const $ = cheerio.load(html);
    const resi = $("thead.bg-primary.text-light th").first().text().split(": ")[1]?.trim() || "Tidak ditemukan";
    const details = {};
    $("table.table-summary-tracking tbody tr").each((_, el) => {
      const key = $(el).find("td:first").text().trim().toLowerCase();
      const value = $(el).find("td:last").text().trim();
      details[key] = value || "Tidak tersedia";
    });
    const history = $(".process-step-content").map((_, el) => {
      const rawDate = $(el).find("p.text-3").text().replace(/\s*\|\s*/g, " | ").trim();
      return {
        date: rawDate || "Tidak tersedia",
        status: $(el).find("p.text-4").text().trim() || "Tidak tersedia",
        location: $(el).find("p:last").text().trim() || "Tidak tersedia"
      };
    }).get();
    return {
      resi: resi,
      details: details,
      history: history
    };
  }
  parseList(html) {
    const $ = cheerio.load(html);
    const list = $("#select2 option").map((_, el) => {
      const expedisi = $(el).attr("value");
      const name = $(el).text().trim();
      return expedisi ? {
        expedisi: expedisi,
        name: name
      } : null;
    }).get().filter(Boolean);
    return {
      list: list
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new CekResi();
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
          data = await api.expedisiList();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await api.cekResi(params);
        return res.status(200).json(data);
      case "list":
        data = await api.expedisiList();
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