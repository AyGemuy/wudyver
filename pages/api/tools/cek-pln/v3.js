import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class SepulsaAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 1e4,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "application/json",
        "accept-language": "id-ID",
        origin: "https://www.sepulsa.com",
        referer: "https://www.sepulsa.com/",
        "sec-fetch-site": "same-site"
      }
    }));
    this.apiKey = "qQFAFT8d.6Yt44sZWZdkd1P4jFwAv4E5UyEp9QYNw";
    this.baseUrl = "https://api.sepulsa.com/api/v1";
    this.isReady = false;
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  async init() {
    this.log("Memulai inisialisasi sesi...", "PROSES");
    try {
      const res = await this.client.get("https://www.sepulsa.com/transaction/pln?type=postpaid");
      const $ = cheerio.load(res.data);
      const rawData = $("script#__NEXT_DATA__").html();
      const jsonData = rawData ? JSON.parse(rawData) : {};
      const extractedKey = jsonData?.props?.pageProps?.api_key || this.apiKey;
      this.apiKey = extractedKey;
      this.isReady = true;
      this.log(jsonData?.props ? "API Key dan Cookie berhasil diperbarui." : "Menggunakan Config Default.", "SUKSES");
      this.log(`Current Key: ${this.apiKey}`, "DEBUG");
    } catch (e) {
      this.log(`Gagal Init, lanjut menggunakan default. Error: ${e.message}`, "WARN");
      this.isReady = true;
    }
  }
  async check({
    id,
    ...rest
  }) {
    !this.isReady ? await this.init() : null;
    this.log(`Memproses ID: ${id}`, "PROSES");
    const extraOptions = rest?.options || [];
    const payload = {
      url: `${this.baseUrl}/oscar/products/14/`,
      quantity: 1,
      options: [{
        option: `${this.baseUrl}/oscar/options/1/`,
        value: id?.toString()
      }, ...extraOptions],
      ...rest
    };
    delete payload.options[1];
    try {
      const res = await this.client.post(`${this.baseUrl}/carts/add/`, payload, {
        headers: {
          "x-chital-api-key": this.apiKey,
          "x-chital-order-source": "web",
          "x-chital-requester": "https://www.sepulsa.com",
          "content-type": "application/json"
        }
      });
      this.log("Permintaan sukses.", "SUKSES");
      return {
        status: "200",
        success: true,
        ...res.data
      };
    } catch (e) {
      const errRes = e.response?.data;
      const errCode = e.response?.status || "500";
      const detailMsg = errRes?.errors?.[0]?.detail || errRes?.message || e.message;
      this.log(`Gagal: [${errCode}] ${detailMsg}`, "ERROR");
      return {
        status: errCode.toString(),
        success: false,
        message: detailMsg,
        ...errRes || {}
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.id) {
    return res.status(400).json({
      error: "Parameter 'id' diperlukan"
    });
  }
  const api = new SepulsaAPI();
  try {
    const data = await api.check(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}