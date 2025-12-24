import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class BagusPulsaService {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.defaultHeaders = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://baguspulsa.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://baguspulsa.com/",
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
      const url = "https://baguspulsa.com/";
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
    voucher,
    pembayaran
  }) {
    try {
      const csrf_token = await this.getCsrfToken();
      const url = "https://baguspulsa.com/pulsa";
      const data = new URLSearchParams({
        csrf_token: csrf_token,
        nomor_hp: nomor_hp || "082100000000",
        pembayaran: pembayaran || "qris_oke",
        operator: operator || "3",
        voucher: voucher || "13",
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
      const url = `https://baguspulsa.com/history/view/${transaction_id}`;
      const response = await this.client.get(url, {
        headers: this.defaultHeaders
      });
      const $ = cheerio.load(response.data);
      const transaksi = {
        id_transaksi: $("h3:contains('Id Transaksi') b").text().trim(),
        produk: $("tr:contains('P U L S A') td:nth-child(2)").text().trim(),
        nominal: $("tr:contains('Nominal') td:nth-child(2)").text().trim(),
        nomor_hp: $("tr:contains('Nomor Handphone') td:nth-child(2)").text().trim(),
        total_harga: $("tr:contains('Total Harga') td:nth-child(2)").text().trim(),
        metode_pembayaran: $("tr:contains('Bayar Dengan') td:nth-child(2)").text().trim(),
        tanggal_pembelian: $("tr:contains('Tanggal Pembelian') td:nth-child(2)").text().trim(),
        status_pembayaran: $("tr:contains('Status Pembayaran') td:nth-child(2)").text().trim(),
        status_pengisian: $("tr:contains('Status Pengisian') td:nth-child(2)").text().trim(),
        total_bayar: $("td:contains('Total Bayar') + td").text().trim(),
        batas_pembayaran: $("li:contains('Pembayaran berlaku s/d') b").text().trim(),
        qris_image: $("img[src*='qris_oke']").attr("src") || null
      };
      if (!transaksi.id_transaksi) {
        throw new Error("Transaksi tidak ditemukan atau halaman tidak dapat diakses.");
      }
      return transaksi;
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
  const api = new BagusPulsaService();
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