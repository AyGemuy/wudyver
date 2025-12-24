import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class LacakPaket {
  constructor() {
    this.cek_url = "https://cekcargo.com/cek-resi-xhr.php?__amp_source_origin=https%3A%2F%2Fcekcargo.com";
    this.list_url = "https://cekcargo-com.cdn.ampproject.org/v/s/cekcargo.com/cek-resi-jt-express/?amp_js_v=0.1&usqp=mq331AQIUAKwASCAAgM%3D";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "multipart/form-data",
      origin: "https://cekcargo-com.cdn.ampproject.org",
      priority: "u=1, i",
      referer: "https://cekcargo-com.cdn.ampproject.org/v/s/cekcargo.com/cek-resi-jt-express/?amp_js_v=0.1&usqp=mq331AQIUAKwASCAAgM%3D",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async cekResi({
    expedisi: courierCode = "jnt",
    resi: awb = "JX3708794672"
  }) {
    try {
      const formData = new FormData();
      formData.append("courier_code", courierCode);
      formData.append("awb", awb);
      const response = await axios.post(this.cek_url, formData, {
        headers: {
          ...this.headers,
          ...formData.headers
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error saat mengecek resi:", error.message);
      return null;
    }
  }
  async expedisiList() {
    try {
      const {
        data
      } = await axios.get(this.list_url, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const expedisiList = [];
      $(".btnexp").each((_, el) => {
        const onAttr = $(el).attr("on") || "";
        const start = onAttr.indexOf("expvalueresi:'");
        if (start !== -1) {
          const valueStart = start + 14;
          const end = onAttr.indexOf("'", valueStart);
          const valueResi = onAttr.substring(valueStart, end);
          const name = $(el).text().trim();
          if (valueResi && name) expedisiList.push({
            expedisi: valueResi,
            name: name
          });
        }
      });
      return {
        list: expedisiList
      };
    } catch (error) {
      console.error("Error mengambil daftar ekspedisi:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new LacakPaket();
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