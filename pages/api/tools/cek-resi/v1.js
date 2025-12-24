import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
class ResiService {
  constructor() {
    this.baseUrl = "https://cekresi.com";
    this.url = "https://cektarif.com/resi/initialize_exp.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: this.baseUrl,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: this.baseUrl,
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.cookie = null;
  }
  encrypt(string) {
    const key = Buffer.from("79540e250fdb16afac03e19c46dbdeb3", "hex");
    const iv = Buffer.from("eb2bb9425e81ffa942522e4414e95bd0", "hex");
    const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
    return cipher.update(string, "utf8", "base64") + cipher.final("base64");
  }
  async getCookies() {
    try {
      const {
        headers
      } = await axios.get(this.baseUrl, {
        headers: this.headers
      });
      return headers["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
    } catch {
      throw new Error("Failed to fetch cookies");
    }
  }
  async fetchData(act, url, params = {}) {
    try {
      const cookie = await this.getCookies();
      this.cookie = cookie;
      const {
        data
      } = await axios.get(url, {
        params: params,
        headers: {
          ...this.headers,
          cookie: this.cookie
        }
      });
      const result = act === "list" ? data.content : data;
      return cheerio.load(result);
    } catch {
      throw new Error("Failed to fetch data");
    }
  }
  async cekResi({
    nomor
  }) {
    const $ = await this.fetchData("check", `${this.baseUrl}/?noresi=${nomor}`);
    const formData = {};
    $("#form_cek input").each((_, element) => {
      const name = $(element).attr("name");
      const value = $(element).val();
      if (name) formData[name] = value;
    });
    return formData;
  }
  async listExpedisiRequest({
    resi: nomor
  }) {
    const w = Math.random().toString(36).substring(7);
    const $ = await this.fetchData("list", this.url, {
      r: nomor,
      p: "1",
      w: w
    });
    const list = $("a").map((_, element) => {
      const name = $(element).text().trim();
      const onclickAttr = $(element).attr("onclick");
      return onclickAttr?.includes("setExp(") ? {
        name: name,
        expedisi: onclickAttr.match(/setExp\('([^']+)'/)[1]
      } : null;
    }).get().filter(Boolean);
    return {
      list: list
    };
  }
  async cekResiRequest({
    resi: nomor = "JX3708794672",
    ui = "69581146146eadd16910595be64d2cc1",
    p = "1",
    expedisi: e = "jnt"
  }) {
    const formData = await this.cekResi({
      nomor: nomor
    });
    const encryptedS = this.encrypt(nomor);
    const data = new URLSearchParams({
      viewstate: formData.viewstate,
      secret_key: formData.secret_key,
      e: e.toUpperCase(),
      noresi: formData.noresi,
      timers: encryptedS
    });
    try {
      const {
        data: html
      } = await axios.post("https://apa1.cekresi.com/cekresi/resi/initialize.php", data, {
        headers: this.headers,
        params: {
          ui: ui,
          p: p,
          w: Math.random().toString(36).substring(7)
        }
      });
      const $ = cheerio.load(html);
      const result = {
        noResi: $('td:contains("No Resi")').next().next().text() || "N/A",
        tanggalPengiriman: $('td:contains("Tanggal Pengiriman")').next().next().text() || "N/A",
        penerima: $('td:contains("Penerima")').next().next().text() || "N/A",
        status: $("#status_resi b").text() || "N/A",
        lastPosition: $("#last_position").text().trim() || "N/A",
        history: $("table.table-striped tbody tr:gt(0)").map((_, element) => ({
          date: $(element).find("td:nth-child(1)").text(),
          description: $(element).find("td:nth-child(2)").text()
        })).get().filter(({
          date,
          description
        }) => typeof date === "string" && date.trim().length > 5 && typeof description === "string" && description.trim().length > 5)
      };
      return result;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new ResiService();
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
          data = await api.listExpedisiRequest(params);
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await api.cekResiRequest(params);
        return res.status(200).json(data);
      case "list":
        data = await api.listExpedisiRequest(params);
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