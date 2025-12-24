import axios from "axios";
import * as cheerio from "cheerio";
class SmsScraper {
  constructor() {
    this.scrapers = {
      smstome: {
        country: this._smstomeCountry,
        create: this._smstomeCreate,
        message: this._smstomeMessage
      },
      sms24: {
        country: this._sms24Country,
        create: this._sms24Create,
        message: this._sms24Message
      }
    };
  }
  async _smstomeCountry() {
    try {
      const {
        data
      } = await axios.get("https://smstome.com");
      const $ = cheerio.load(data);
      return $(".column.fields ul li").map((_, li) => ({
        title: $("a", li).text().trim(),
        countryCode: $("a", li).attr("href")?.split("/").pop(),
        countryFlag: "https://smstome.com" + $("img", li).attr("src"),
        link: "https://smstome.com" + $("a", li).attr("href")
      })).get().filter(x => Object.values(x).every(Boolean));
    } catch (err) {
      return {
        success: false,
        error: "Gagal mengambil daftar negara dari smstome."
      };
    }
  }
  async _smstomeCreate(country) {
    try {
      const {
        data
      } = await axios.get(`https://smstome.com/country/${country}`);
      const $ = cheerio.load(data);
      return $(".numview").map((_, el) => ({
        phoneNumber: $("a", el).text().trim(),
        location: $("div.row:nth-child(1) > div > small", el).text().trim(),
        addedDate: $("div.row:nth-child(2) > small", el).text().trim(),
        link: "https://smstome.com" + $("a", el).attr("href")
      })).get().filter(x => Object.values(x).every(Boolean));
    } catch (err) {
      return {
        success: false,
        error: `Gagal mengambil nomor dari smstome untuk negara: ${country}.`
      };
    }
  }
  async _smstomeMessage({
    url,
    page
  }) {
    try {
      const {
        data
      } = await axios.get(page ? `${url}?page=${page}` : url);
      const $ = cheerio.load(data);
      return $("table.messagesTable tbody tr").map((_, row) => ({
        from: $("td:nth-child(1)", row).text().trim(),
        received: $("td:nth-child(2)", row).text().trim(),
        content: $("td:nth-child(3)", row).text().trim()
      })).get().filter(x => Object.values(x).every(Boolean));
    } catch (err) {
      return {
        success: false,
        error: `Gagal mengambil pesan dari smstome untuk URL: ${url}.`
      };
    }
  }
  async _sms24Country() {
    try {
      const {
        data
      } = await axios.get("https://sms24.me/en/countries");
      const $ = cheerio.load(data);
      return $(".callout").map((_, div) => ({
        title: $("span.placeholder.h5", div).text().trim(),
        link: "https://sms24.me/en/countries/" + $("span.fi", div).attr("data-flag"),
        countryFlag: $("span.fi", div).attr("data-flag")
      })).get();
    } catch (err) {
      return {
        success: false,
        error: "Gagal mengambil daftar negara dari sms24."
      };
    }
  }
  async _sms24Create(country) {
    try {
      const {
        data
      } = await axios.get(`https://sms24.me/en/countries/${country}`);
      const $ = cheerio.load(data);
      return $(".callout").map((_, el) => ({
        phoneNumber: $(".fw-bold.text-primary", el).text().trim(),
        country: $("h5", el).text().trim(),
        link: "https://sms24.me/en/numbers/" + $(".fw-bold.text-primary", el).text().trim()
      })).get();
    } catch (err) {
      return {
        success: false,
        error: `Gagal mengambil nomor dari sms24 untuk negara: ${country}.`
      };
    }
  }
  async _sms24Message({
    number
  }) {
    try {
      const {
        data
      } = await axios.get(`https://sms24.me/en/numbers/${number}`);
      const $ = cheerio.load(data);
      return $(".shadow-sm.bg-light.rounded.border-start.border-info.border-5").map((_, el) => ({
        from: $("a", el).text().replace("From:", "").trim(),
        content: $("span", el).text().trim()
      })).get();
    } catch (err) {
      return {
        success: false,
        error: `Gagal mengambil pesan dari sms24 untuk nomor: ${number}.`
      };
    }
  }
  async country({
    site
  }) {
    if (!this.scrapers[site] || !this.scrapers[site].country) {
      return {
        success: false,
        error: `Situs atau aksi tidak valid: '${site}'.`
      };
    }
    const result = await this.scrapers[site].country();
    return result.success === false ? result : {
      success: true,
      result: result
    };
  }
  async create({
    site,
    country
  }) {
    if (!this.scrapers[site] || !this.scrapers[site].create) {
      return {
        success: false,
        error: `Situs atau aksi tidak valid: '${site}'.`
      };
    }
    if (!country) {
      return {
        success: false,
        error: "Paramenter 'country' diperlukan."
      };
    }
    const result = await this.scrapers[site].create(country);
    return result.success === false ? result : {
      success: true,
      result: result
    };
  }
  async message({
    site,
    url,
    number,
    page
  }) {
    if (!this.scrapers[site] || !this.scrapers[site].message) {
      return {
        success: false,
        error: `Situs atau aksi tidak valid: '${site}'.`
      };
    }
    const params = site === "smstome" ? {
      url: url,
      page: page
    } : {
      number: number
    };
    if (site === "smstome" && !url || site === "sms24" && !number) {
      return {
        success: false,
        error: `Paramenter '${site === "smstome" ? "url" : "number"}' diperlukan.`
      };
    }
    const result = await this.scrapers[site].message(params);
    return result.success === false ? result : {
      success: true,
      result: result
    };
  }
}
export default async function handler(req, res) {
  const {
    site,
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!site || !action) {
    return res.status(400).json({
      success: false,
      error: "Paramenter 'site' dan 'action' diperlukan.",
      allowed_sites: ["smstome", "sms24"],
      allowed_actions: ["country", "create", "message"]
    });
  }
  const scraper = new SmsScraper();
  try {
    let result;
    switch (action.toLowerCase()) {
      case "country":
        result = await scraper.country({
          site: site
        });
        break;
      case "create":
        result = await scraper.create({
          site: site,
          ...params
        });
        break;
      case "message":
        result = await scraper.message({
          site: site,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Aksi tidak valid: '${action}'. Aksi yang diizinkan: 'country' | 'create' | 'message'.`
        });
    }
    if (result && result.success === false) {
      return res.status(500).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Terjadi error saat memproses permintaan: ${error.message}`
    });
  }
}