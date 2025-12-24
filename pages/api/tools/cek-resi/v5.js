import axios from "axios";
import * as cheerio from "cheerio";
class LacakResiScraper {
  constructor() {
    this.baseURL = "https://lacakresi.id";
    this.defaultHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      referer: "https://lacakresi.id/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async expedisiList() {
    try {
      const response = await axios.get(this.baseURL, {
        headers: {
          ...this.defaultHeaders
        }
      });
      if (response.status !== 200) {
        throw new Error(`Request failed with status code ${response.status}`);
      }
      return this.parseExpedisiList(response.data);
    } catch (error) {
      console.error("Error getting expedisi list:", error.message);
      throw error;
    }
  }
  parseExpedisiList(html) {
    const $ = cheerio.load(html);
    const expedisiList = [];
    const selectElement = $('select[name="courier"]');
    if (selectElement.length) {
      selectElement.find("option").each((i, option) => {
        const value = $(option).attr("value");
        const text = $(option).text().trim();
        if (value !== "") {
          expedisiList.push({
            value: value,
            name: text
          });
        }
      });
    }
    return expedisiList;
  }
  async cekResi({
    resi,
    expedisi: courier = "spx"
  }) {
    try {
      const url = `${this.baseURL}/search?resi=${resi}&courier=${courier}`;
      const response = await axios.get(url, {
        headers: {
          ...this.defaultHeaders
        }
      });
      if (response.status !== 200) {
        throw new Error(`Request failed with status code ${response.status}`);
      }
      return this.parseData(response.data);
    } catch (error) {
      console.error("Error tracking resi:", error.message);
      throw error;
    }
  }
  parseData(html) {
    const $ = cheerio.load(html);
    const result = {
      expedisi: "",
      noResi: "",
      tanggalKirim: "",
      pengirim: "",
      penerima: "",
      status: "",
      history: []
    };
    const detailPaket = $("#accordionOne");
    if (detailPaket.length) {
      result.expedisi = detailPaket.find("h4.text-dark").text().trim() || "";
      const rows = detailPaket.find("table tbody tr");
      rows.each((i, row) => {
        const label = $(row).find("td:first-child").text().trim();
        const value = $(row).find("td:last-child").text().trim();
        switch (label) {
          case "No Resi":
            result.noResi = value;
            break;
          case "Dikirim tanggal":
            result.tanggalKirim = value;
            break;
          case "Dikirim oleh":
            result.pengirim = value;
            break;
          case "Dikirim ke":
            result.penerima = value;
            break;
          case "Status":
            result.status = value;
            break;
        }
      });
    }
    const historyItems = $(".timeline-item");
    historyItems.each((i, item) => {
      const location = $(item).find(".timeline-header h6").text().trim();
      const timestamp = $(item).find(".timeline-header span.text-muted").text().trim();
      const description = $(item).find(".d-flex.align-items-center span").text().trim();
      if (location || timestamp || description) {
        result.history.push({
          location: location,
          timestamp: timestamp,
          description: description
        });
      }
    });
    return result;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new LacakResiScraper();
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