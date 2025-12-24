import axios from "axios";
class VeepnSmsScraper {
  constructor() {
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async getCountries() {
    try {
      const response = await axios.get("https://veepn.com/online-sms/countries/", {
        headers: {
          ...this.defaultHeaders,
          referer: "https://veepn.com/online-sms/"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil daftar negara dari VeePN: ${error.message}`);
    }
  }
  async getNumbers(country) {
    try {
      const response = await axios.get(`https://veepn.com/online-sms/countries/${country}/`, {
        headers: {
          ...this.defaultHeaders,
          referer: `https://veepn.com/online-sms/${country}/`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil nomor dari VeePN untuk negara ${country}: ${error.message}`);
    }
  }
  async getMessages(country, number, page = 1, count = 100) {
    try {
      const response = await axios.get(`https://veepn.com/online-sms/countries/${country}/${number}/?page=${page}&count=${count}`, {
        headers: {
          ...this.defaultHeaders,
          referer: `https://veepn.com/online-sms/${country}/${number}/`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Gagal mengambil pesan dari VeePN untuk nomor ${number}: ${error.message}`);
    }
  }
  async country() {
    try {
      const result = await this.getCountries();
      return {
        success: true,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async create({
    country
  }) {
    if (!country) {
      return {
        success: false,
        error: "Paramenter 'country' diperlukan."
      };
    }
    try {
      const result = await this.getNumbers(country);
      return {
        success: true,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async message({
    country,
    number,
    page = 1,
    count = 100
  }) {
    if (!country || !number) {
      return {
        success: false,
        error: "Paramenter 'country' dan 'number' diperlukan."
      };
    }
    try {
      const result = await this.getMessages(country, number, page, count);
      return {
        success: true,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    country,
    number,
    page = 1,
    count = 100,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      success: false,
      error: "Paramenter 'action' diperlukan.",
      allowed_actions: ["country", "create", "message"],
      usage: {
        country: "GET /api/veepn-sms?action=country",
        create: "GET /api/veepn-sms?action=create&country=russia",
        message: "GET /api/veepn-sms?action=message&country=russia&number=79273719818&page=1&count=100"
      }
    });
  }
  const scraper = new VeepnSmsScraper();
  try {
    let result;
    switch (action.toLowerCase()) {
      case "country":
        result = await scraper.country();
        break;
      case "create":
        result = await scraper.create({
          country: country
        });
        break;
      case "message":
        result = await scraper.message({
          country: country,
          number: number,
          page: parseInt(page),
          count: parseInt(count)
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