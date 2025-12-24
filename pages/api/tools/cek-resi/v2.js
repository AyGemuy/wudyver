import axios from "axios";
class BiteshipTracking {
  constructor(apiKey = "Public") {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.biteship.com/v1/public/trackings";
    this.couriers = ["jne", "jnt", "sicepat", "tiki", "ninja"];
  }
  async trackShipment({
    resi: trackingNumber = "JX3708794672",
    expedisi: courier = "jnt"
  }) {
    try {
      if (!this.couriers.includes(courier)) {
        throw new Error("Kurir tidak valid. Gunakan: jne, jnt, sicepat, tiki, ninja");
      }
      const response = await axios.get(`${this.baseUrl}/${trackingNumber}/couriers/${courier}`, {
        headers: this._getHeaders()
      });
      return response.data;
    } catch (error) {
      return this._handleError(error);
    }
  }
  getCourierList() {
    return {
      list: this.couriers
    };
  }
  _getHeaders() {
    return {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      authorization: this.apiKey,
      "content-type": "application/json",
      origin: "https://biteship.com",
      priority: "u=1, i",
      referer: "https://biteship.com/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  _handleError(error) {
    return error.response ? error.response.data : {
      error: error.message
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new BiteshipTracking();
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
          data = await api.getCourierList();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await api.trackShipment(params);
        return res.status(200).json(data);
      case "list":
        data = await api.getCourierList();
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