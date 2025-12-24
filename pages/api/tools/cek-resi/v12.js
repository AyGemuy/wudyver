import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class ParcelTrack {
  constructor() {
    this.parcelUrl = "https://parcelsapp.com";
    this.baseUrl = "https://parcelsapp.com/id/tracking/";
    this.proxyUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=`;
  }
  async expedisiList() {
    try {
      const targetUrl = `${this.parcelUrl}`;
      const requestUrl = `${this.proxyUrl}${encodeURIComponent(targetUrl)}`;
      const {
        data: html
      } = await axios.get(requestUrl);
      const $ = cheerio.load(html);
      return $(".row.columns.copy > div").map((i, el) => ({
        marketplace: $(el).find("h3.with-icon").text().trim() || "N/A",
        logoUrl: $(el).find("img.lazy").attr("data-src") || "",
        link: $(el).find("a").attr("href") || "#",
        description: $(el).find("p").text().trim() || "No description"
      })).get();
    } catch (error) {
      console.error("Gagal mengambil atau memproses data:", error.message);
      return [];
    }
  }
  async getTrackingInfo(resi) {
    try {
      const targetUrl = `${this.baseUrl}${resi}`;
      const requestUrl = `${this.proxyUrl}${encodeURIComponent(targetUrl)}`;
      const {
        data: html
      } = await axios.get(requestUrl);
      const $ = cheerio.load(html);
      return $("section#tracking-info ul.events li.event").map((i, el) => ({
        tanggal: $(el).find(".event-time strong").text().trim() || "-",
        waktu: $(el).find(".event-time span").text().trim() || "-",
        status: $(el).find(".event-content strong").text().trim() || "-",
        lokasi: $(el).find(".event-content span.location").text().trim() || "-"
      })).get();
    } catch (error) {
      console.error("Gagal mengambil atau memproses data:", error.message);
      return [];
    }
  }
  async cekResi({
    resi = "SPXID050017667543"
  }) {
    try {
      return await this.getTrackingInfo(resi);
    } catch (error) {
      console.error("Gagal dalam fungsi cekResi:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new ParcelTrack();
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