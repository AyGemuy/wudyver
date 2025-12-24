import axios from "axios";
import * as cheerio from "cheerio";
class CekPengirimanScraper {
  constructor() {
    this.baseURL = "https://www.cekpengiriman.com";
    this.defaultHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
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
    this.cookies = {
      _ga: "amp-I_XT79j4EJ4el1bP7mobxg",
      "-test-amp-cookie-tmp": "TESTCOOKIEVALUE"
    };
  }
  _formatCookies() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  async expedisiList() {
    try {
      const response = await axios.get(this.baseURL, {
        headers: {
          ...this.defaultHeaders,
          cookie: this._formatCookies()
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
    const selectElement = $('select[name="kurir"]');
    if (selectElement.length) {
      selectElement.find("option").each((i, option) => {
        const value = $(option).attr("value");
        const text = $(option).text().trim();
        if (value && value !== "") {
          expedisiList.push({
            value: value,
            name: text
          });
        }
      });
    }
    return expedisiList;
  }
  async trackResi({
    resi,
    expedisi: kurir = "spx"
  }) {
    try {
      const url = `${this.baseURL}/cek-resi?resi=${resi}&kurir=${kurir}`;
      const response = await axios.get(url, {
        headers: {
          ...this.defaultHeaders,
          cookie: this._formatCookies()
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
      ringkasan: {},
      history: []
    };
    const panelHeading = $(".panel-heading");
    if (panelHeading.length) {
      result.expedisi = panelHeading.first().text().trim();
    }
    const ringkasanTable = $('h4:contains("Ringkasan")').next("table");
    if (ringkasanTable.length) {
      ringkasanTable.find("tr").each((i, row) => {
        const label = $(row).find("td:first-child").text().trim();
        const value = $(row).find("td:last-child").text().trim();
        if (label && value) {
          result.ringkasan[label] = value;
          if (label.includes("No. Resi") || label.includes("No Resi")) {
            result.noResi = value;
          }
        }
      });
    }
    const historyTable = $('h4:contains("Riwayat Pengiriman")').next("table");
    if (historyTable.length) {
      historyTable.find("tr").each((i, row) => {
        const text = $(row).find("td").text().trim();
        if (text) {
          const timestampMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s+\((\d{2}:\d{2})\)\s+-\s+(.*)/);
          if (timestampMatch) {
            result.history.push({
              date: timestampMatch[1],
              time: timestampMatch[2],
              description: timestampMatch[3],
              fullText: text
            });
          } else {
            result.history.push({
              fullText: text
            });
          }
        }
      });
    }
    return result;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new CekPengirimanScraper();
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
        data = await api.trackResi(params);
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