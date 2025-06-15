import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class UpulsaService {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.defaultHeaders = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Origin: "https://www.upulsa.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://www.upulsa.com/",
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
      const url = "https://www.upulsa.com/";
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
    pembayaran,
    produk,
    operator,
    voucher,
    id_plgn
  }) {
    try {
      const csrf_token = await this.getCsrfToken();
      const url = "https://www.upulsa.com/pulsa";
      const data = new URLSearchParams({
        csrf_token: csrf_token,
        nomor_hp: nomor_hp || "082100000000",
        pembayaran: pembayaran || "qris",
        produk: produk || "pulsa",
        operator: operator || "2",
        voucher: voucher || "74",
        id_plgn: id_plgn || "",
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
      const url = `https://www.upulsa.com/payment/qris/duitku/inquiry/trx/${transaction_id}`;
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
  const api = new UpulsaService();
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