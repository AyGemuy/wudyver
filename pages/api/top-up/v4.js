import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class YagamiCellService {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.defaultHeaders = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Origin: "https://yagami-cell.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://yagami-cell.com/neworder2/pulsa",
      "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "Sec-CH-UA-Mobile": "?1",
      "Sec-CH-UA-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest"
    };
  }
  async getCsrfToken() {
    try {
      const url = "https://yagami-cell.com/";
      const response = await this.client.get(url, {
        headers: this.defaultHeaders
      });
      const cookies = await this.jar.getCookies(url);
      const csrfCookie = cookies.find(cookie => cookie.key === "csrf_cookie");
      if (!csrfCookie) {
        const $ = cheerio.load(response.data);
        return $('input[name="csrf_token"]').val();
      }
      return csrfCookie.value;
    } catch (error) {
      throw new Error("Gagal mengambil CSRF token: " + error.message);
    }
  }
  async orderPulsa({
    nomor_hp,
    operator,
    pembayaran,
    voucher
  }) {
    try {
      const csrf_token = await this.getCsrfToken();
      const url = "https://yagami-cell.com/pulsa";
      const data = new URLSearchParams({
        csrf_token: csrf_token,
        nomor_hp: nomor_hp || "082100000000",
        pembayaran: pembayaran || "qris_payment",
        operator: operator || "135",
        voucher: voucher || "1627",
        json_format: "1"
      }).toString();
      return await this.request("POST", url, data);
    } catch (error) {
      return {
        error: "Gagal melakukan pemesanan pulsa: " + error.message
      };
    }
  }
  async checkTransaction({
    transaction_id
  }) {
    try {
      const url = `https://yagami-cell.com/api/main/get_trx_users/${transaction_id}`;
      return await this.request("GET", url);
    } catch (error) {
      return {
        error: "Gagal mengecek transaksi: " + error.message
      };
    }
  }
  async request(method, url, data = null) {
    try {
      const config = {
        method: method,
        url: url,
        headers: this.defaultHeaders,
        ...method === "POST" && {
          data: data
        }
      };
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      return {
        error: "Gagal melakukan permintaan: " + (error.response?.data || error.message)
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...body
  } = req.method === "POST" ? req.body : req.query;
  const api = new YagamiCellService();
  try {
    let result;
    switch (action) {
      case "create":
        result = await api.orderPulsa(body);
        break;
      case "check":
        result = await api.checkTransaction(body);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}