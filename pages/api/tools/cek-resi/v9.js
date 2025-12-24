import crypto from "crypto";
import axios from "axios";
class TrackingService {
  constructor() {
    this.secret = "0ebfffe63d2a481cf57fe7d5ebdc9fd6";
    this.courierLists = {
      spx: "Shopee Express"
    };
  }
  generateTrackingNumber(resi) {
    const timestamp = Math.floor(Date.now() / 1e3);
    const secretBase64 = Buffer.from(this.secret).toString("base64");
    const hash = crypto.createHash("sha256").update(resi + timestamp + secretBase64).digest("hex");
    return `${resi}|${timestamp}${hash}`;
  }
  getExpedisi() {
    return this.courierLists;
  }
  async check({
    resi
  }) {
    const trackingNumber = this.generateTrackingNumber(resi);
    try {
      const response = await axios.get(`https://spx.co.id/api/v2/fleet_order/tracking/search?sls_tracking_number=${trackingNumber}`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          cookie: "_gcl_au=1.1.1559766446.1743344722; _med=refer; _ga=GA1.1.2115444713.1743344728; _ga_3CRNHSSGVR=GS1.1.1743344727.1.1.1743344937.59.0.0",
          priority: "u=1, i",
          referer: `https://spx.co.id/m/tracking-detail/${resi}`,
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          source: "mobile",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-language": "id"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching tracking data: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new TrackingService();
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
          data = api.getExpedisi();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
          });
        }
        data = await api.check(params);
        return res.status(200).json(data);
      case "list":
        data = api.getExpedisi();
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