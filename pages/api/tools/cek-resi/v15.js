import axios from "axios";
class MengantarScraper {
  constructor() {
    this.baseURL = "https://app.mengantar.com/api/order/getPublic";
    this.defaultHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://www.mengantar.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.mengantar.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  expedisiList() {
    return [{
      value: "JNE",
      name: "JNE Express"
    }, {
      value: "SiCepat",
      name: "SiCepat Express"
    }, {
      value: "Sap",
      name: "SAP Express"
    }, {
      value: "iDexpress",
      name: "IDExpress"
    }, {
      value: "JT",
      name: "J&T Express"
    }, {
      value: "lion",
      name: "Lion Express"
    }, {
      value: "Ninja",
      name: "Ninja Express"
    }, {
      value: "paxel",
      name: "Paxel"
    }];
  }
  async trackResi({
    resi: tracking_number,
    expedisi: courier = "JT"
  }) {
    try {
      const response = await axios.get(this.baseURL, {
        params: {
          tracking_number: tracking_number,
          courier: courier
        },
        headers: this.defaultHeaders
      });
      return response.data;
    } catch (error) {
      console.error("Error tracking resi:", error.message);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new MengantarScraper();
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
        data = await api.trackResi(params);
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