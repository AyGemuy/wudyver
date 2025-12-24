import axios from "axios";
class BiteshipAPI {
  constructor(apiKey = "Public") {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.biteship.com/v1";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
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
      }
    });
  }
  async getAreas({
    input,
    type = "single",
    countries = "ID"
  }) {
    try {
      const response = await this.client.get("/maps/areas", {
        params: {
          countries: countries,
          input: input,
          type: type
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
  async getCourierRates({
    origin_id,
    destination_id,
    weight = "1000",
    height = "1",
    length = "1",
    width = "1"
  }) {
    try {
      const rateData = {
        origin_area_id: origin_id,
        destination_area_id: destination_id,
        couriers: "jne,sicepat,anteraja,wahana,rpx,idexpress,jdl,lion,tiki,jnt,ninja,sap,pos",
        items: [{
          weight: weight,
          height: height,
          length: length,
          width: width
        }]
      };
      const response = await this.client.post("/rates/couriers?channel=biteship_landing_page", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const biteship = new BiteshipAPI();
  try {
    let data;
    switch (action) {
      case "area":
        if (!params.input) {
          return res.status(400).json({
            error: "Silakan masukkan input area."
          });
        }
        data = await biteship.getAreas(params);
        return res.status(200).json(data);
      case "check":
        const requiredParams = ["origin_id", "destination_id"];
        const missingParams = requiredParams.filter(param => !params[param]);
        if (missingParams.length) {
          return res.status(400).json({
            error: `Silakan masukkan ${missingParams.join(", ")}.`
          });
        }
        data = await biteship.getCourierRates(params);
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Aksi yang diminta tidak valid.",
          availableActions: ["check", "area"]
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan."
    });
  }
}