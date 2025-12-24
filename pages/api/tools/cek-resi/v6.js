import axios from "axios";
import * as cheerio from "cheerio";
class ResiChecker {
  constructor() {
    this.url = "https://resinesia.com/wp-admin/admin-ajax.php";
    this.headers = {
      "sec-ch-ua-platform": '"Android"',
      referer: "https://resinesia.com/tracking/",
      "accept-language": "id-ID,id;q=0.9",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "x-requested-with": "XMLHttpRequest",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      accept: "*/*",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
    this.courierLists = {
      jne: "JNE",
      pos: "POS",
      tiki: "TIKI",
      pcp: "PCP",
      rpx: "RPX",
      wahana: "WAHANA",
      sicepat: "SICEPAT",
      jnt: "J&T Express",
      sap: "SAP",
      jet: "JET",
      dse: "DSE",
      first: "FIRST",
      lion: "LION Parcel",
      ninja: "NINJA Xpress",
      idl: "IDL",
      rex: "REX",
      ide: "ID Express",
      sc: "Sentra Kargo",
      spx: "Shopee Express",
      anteraja: "AnterAja"
    };
  }
  async cekResi({
    resi = "JX3708794672",
    expedisi = "jnt"
  }) {
    try {
      const {
        data
      } = await axios.post(this.url, new URLSearchParams({
        action: "indonesia_ongkir_cek_resi",
        waybill_number: resi,
        page_link: "https://resinesia.com/tracking/",
        courier: expedisi,
        nYTUqCoFOhaXxWNy: "d8pX9tan7j_Lm",
        rYKVkBXmcGiE: "uqgWCx.vwphbQt",
        ztglTsLvCnrSumX: "iOZgpCvG1",
        QRPoXeLk: "xXf5q0H"
      }), {
        headers: this.headers
      });
      return this.parseResponse(data.join(""));
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  parseResponse(html) {
    const $ = cheerio.load(html);
    return {
      kurir: $(".summary div:nth-child(1) span:nth-child(2)").text().trim() || "-",
      nomorResi: $(".summary div:nth-child(2) span:nth-child(2)").text().trim() || "-",
      status: $(".summary div:nth-child(3) span:nth-child(2)").text().trim() || "-",
      history: $("table tbody tr").map((_, row) => ({
        tanggal: $(row).find('td[data-label="Tanggal"]').text().trim() || "-",
        keterangan: $(row).find('td[data-label="Keterangan"]').text().trim() || "-"
      })).get(),
      shareLink: $(".copy-link .value-to-copy").attr("value") || "-"
    };
  }
  getExpedisi() {
    return this.courierLists;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new ResiChecker();
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
          data = await api.getExpedisi();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await api.cekResi(params);
        return res.status(200).json(data);
      case "list":
        data = await api.getExpedisi();
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