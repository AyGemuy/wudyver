import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TopupService {
  constructor() {
    const cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://topupservice.belanjapasti.com",
      headers: {
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        Origin: "https://topup.ebelanja.id",
        Pragma: "no-cache",
        Priority: "u=1, i",
        Referer: "https://topup.ebelanja.id/",
        "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "Sec-CH-UA-Mobile": "?1",
        "Sec-CH-UA-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      },
      jar: cookieJar,
      withCredentials: true
    }));
  }
  async createTransaction({
    user_id,
    product_detail_id,
    payment_method,
    price
  }) {
    try {
      const response = await this.client.post("/transactions", {
        user_id: user_id || "082100000000",
        product_detail_id: product_detail_id || 254,
        payment_method: payment_method || "qris",
        price: price || 5339
      });
      return response.data;
    } catch (error) {
      return error.response?.data || {
        error: error.message
      };
    }
  }
  async checkTransaction({
    transaction_id
  }) {
    try {
      const response = await this.client.post("/transactions/check", {
        transaction_id: transaction_id || ""
      });
      return response.data;
    } catch (error) {
      return error.response?.data || {
        error: error.message
      };
    }
  }
  async getProducts(type = "non-games") {
    try {
      const response = await this.client.get(`/products/${type}`);
      return response.data;
    } catch (error) {
      return error.response?.data || {
        error: error.message
      };
    }
  }
  async checkProductDetails({
    user_id,
    product_detail_id,
    payment_method,
    price
  }) {
    try {
      const response = await this.client.post("/product-details/check", {
        user_id: user_id || "082100000000",
        product_detail_id: product_detail_id || 254,
        payment_method: payment_method || "qris",
        price: price || 5339
      });
      return response.data;
    } catch (error) {
      return error.response?.data || {
        error: error.message
      };
    }
  }
  async getNextData(alias = "") {
    const url = alias ? `https://topup.ebelanja.id/_next/data/xNnDgrCHZIAxXY9sv4yxF/${alias}.json?slug=${alias}` : "https://topup.ebelanja.id/_next/data/xNnDgrCHZIAxXY9sv4yxF/index.json";
    try {
      const response = await this.client.get(url, {
        headers: {
          Purpose: "prefetch",
          "X-Nextjs-Data": "1"
        }
      });
      return response.data;
    } catch (error) {
      return error.response?.data || {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...body
  } = req.method === "POST" ? req.body : req.query;
  const api = new TopupService();
  try {
    let result;
    switch (action) {
      case "create":
        result = await api.createTransaction(body);
        break;
      case "check":
        result = await api.checkTransaction(body);
        break;
      case "product":
        result = await api.getProducts(body.type || "non-games");
        break;
      case "detail":
        result = await api.checkProductDetails(body);
        break;
      case "data":
        result = await api.getNextData(body.alias || "");
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