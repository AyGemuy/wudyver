import axios from "axios";
import * as cheerio from "cheerio";
class CekResiPaket {
  constructor() {
    this.baseUrl = "https://cekresipaket.com";
    this.mobileBaseUrl = "https://m.cekresipaket.com";
    this.client = axios.create({
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        referer: this.baseUrl,
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.cookies = "";
  }
  async fetchData(url) {
    try {
      console.log(`Fetching data from: ${url}`);
      const {
        data,
        headers
      } = await this.client.get(url, {
        headers: {
          cookie: this.cookies
        }
      });
      this.cookies = headers["set-cookie"] ? headers["set-cookie"].map(c => c.split(";")[0]).join("; ") : this.cookies;
      console.log("Data fetched successfully");
      return data;
    } catch (error) {
      console.error(`Error fetching data from ${url}: ${error.message}`);
      throw new Error(`Fetch error: ${error.message}`);
    }
  }
  async expedisiList() {
    try {
      console.log("Fetching expedition list...");
      const $ = cheerio.load(await this.fetchData(this.baseUrl));
      const expeditions = $(".container.logo-list .two.columns").map((_, el) => {
        const link = $(el).find("a").attr("href") || "";
        return {
          name: $(el).find("div#footers").text().trim(),
          link: link,
          expedisi: link.split("/").pop()
        };
      }).get();
      console.log("Expedition list fetched successfully");
      return expeditions;
    } catch (error) {
      console.error("Error fetching expedition list:", error.message);
      throw new Error("Error fetching expedition list");
    }
  }
  async cekResi({
    expedisi = "jnt",
    resi = "JX3708794672"
  }) {
    try {
      console.log(`Tracking: ${resi} for expedition: ${expedisi}`);
      const expedition = (await this.expedisiList()).find(e => e.expedisi.toLowerCase() === expedisi.toLowerCase());
      if (!expedition) throw new Error("Expedition not found");
      const $ = cheerio.load(await this.fetchData(`${this.mobileBaseUrl}/${expedition.expedisi}`));
      const apiUrl = `${this.mobileBaseUrl}/${expedition.expedisi}/?apis=${$('form#submit_form input[name="apis"]').val()}&courier=${expedition.expedisi}&resi=${resi}`;
      const $$ = cheerio.load(await this.fetchData(apiUrl));
      const firstTable = {};
      $$("table").first().find("tbody tr").each((_, el) => {
        const cells = $$(el).find("td");
        if (cells.length === 2) {
          firstTable[cells.eq(0).text().trim().toLowerCase().replace(/\s+/g, "_")] = cells.eq(1).text().trim() || "";
        }
      });
      const secondTable = [];
      $$("table").eq(1).find("tbody tr").each((_, el) => {
        const cells = $$(el).find("td");
        if (cells.length === 4) {
          secondTable.push({
            tanggal: cells.eq(0).text().trim() || "",
            info_lokasi: cells.eq(1).text().trim() || "",
            status: cells.eq(2).text().trim() || "",
            keterangan: cells.eq(3).text().trim() || ""
          });
        }
      });
      console.log("Tracking details retrieved successfully");
      return {
        detail: firstTable,
        history: secondTable
      };
    } catch (error) {
      console.error(`Error retrieving tracking info: ${error.message}`);
      throw new Error("Error retrieving tracking info");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new CekResiPaket();
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