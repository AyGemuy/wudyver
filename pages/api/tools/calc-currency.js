import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import qs from "qs";
const pFloat = str => parseFloat((str || "").replace(/\./g, "").replace(",", ".") || 0);
const pDate = str => (str?.match(/(\d{2}\/\d{2}\/\d{2}\s-\s\d{2}:\d{2}\sWIB)/) || [])[1] || "-";
class MandiriAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
    this.url = "https://www.bankmandiri.co.id/web/guest/kurs";
    this.pid = null;
    this.map = {};
    this.rates = [];
  }
  async scan() {
    console.log("-> Scanning data...");
    try {
      const {
        data: html
      } = await this.client.get(this.url);
      const $ = cheerio.load(html);
      const pidRaw = $('[id^="p_p_id_Exchange_Rate_Portlet_INSTANCE_"]').attr("id");
      this.pid = pidRaw?.split("INSTANCE_")?.[1]?.replace(/_/g, "");
      if (!this.pid) throw new Error("Portlet ID not found");
      this.map = $(`select[name="_Exchange_Rate_Portlet_INSTANCE_${this.pid}_from"] option`).map((i, el) => ({
        [$(el).text().trim()]: $(el).val()
      })).get().reduce((acc, curr) => ({
        ...acc,
        ...curr
      }), {});
      const th = $(".table-kurs thead th");
      const lastUpdate = {
        special: pDate(th.eq(1).text()),
        tt: pDate(th.eq(2).text()),
        bank: pDate(th.eq(3).text())
      };
      const rates = $(".table-kurs tbody tr").map((i, el) => {
        const td = $(el).find("td");
        const code = td.eq(0).text().trim();
        if (!code) return null;
        return {
          code: code,
          rate: {
            special: {
              buy: pFloat(td.eq(1).text()),
              sell: pFloat(td.eq(2).text())
            },
            tt: {
              buy: pFloat(td.eq(3).text()),
              sell: pFloat(td.eq(4).text())
            },
            bank: {
              buy: pFloat(td.eq(5).text()),
              sell: pFloat(td.eq(6).text())
            }
          }
        };
      }).get();
      const note = $(".kurs-caption").text().trim().replace(/\s+/g, " ");
      console.log(`-> Scan OK. PID: ${this.pid}, Items: ${rates.length}`);
      this.rates = rates;
      return {
        ok: true,
        meta: {
          pid: this.pid,
          updated: lastUpdate,
          note: note
        },
        data: rates
      };
    } catch (e) {
      console.error("-> Scan Error:", e.message);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
  async calc({
    from = "USD",
    to = "IDR",
    val = 1,
    type = "BUY"
  } = {}) {
    if (!this.pid) await this.scan();
    const fCode = this.map[from],
      tCode = this.map[to];
    if (!fCode || !tCode) return {
      ok: false,
      msg: "Invalid currency code"
    };
    console.log(`-> Calc: ${val} ${from} => ${to} [${type}]`);
    try {
      const prefix = `_Exchange_Rate_Portlet_INSTANCE_${this.pid}_`;
      const body = {
        [`${prefix}value`]: val,
        [`${prefix}from`]: fCode,
        [`${prefix}to`]: tCode,
        [`${prefix}jenis`]: type
      };
      const q = qs.stringify({
        p_p_id: `Exchange_Rate_Portlet_INSTANCE_${this.pid}`,
        p_p_lifecycle: 2,
        p_p_state: "normal",
        p_p_mode: "view",
        p_p_resource_id: "calculateCurrency",
        p_p_cacheability: "cacheLevelPage"
      });
      const {
        data
      } = await this.client.post(`${this.url}?${q}`, qs.stringify(body), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      const raw = data?.value;
      const res = typeof raw === "number" ? raw : pFloat(raw);
      return {
        ok: true,
        query: {
          from: from,
          to: to,
          val: val,
          type: type
        },
        result: res,
        text: new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: to
        }).format(res),
        rates: this.rates,
        map: this.map
      };
    } catch (e) {
      console.error("-> Calc Error:", e.message);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MandiriAPI();
  try {
    const data = await api.calc(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}