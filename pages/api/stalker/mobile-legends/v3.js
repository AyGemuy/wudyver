import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class GempayTopup {
  constructor() {
    this.url = "https://www.gempaytopup.com/stalk-ml";
    this.cookieJar = new CookieJar();
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.gempaytopup.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.gempaytopup.com/stalk-ml",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.data = {
      uid: "92666339",
      zone: "2193"
    };
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
  }
  async getCsrfToken() {
    try {
      const response = await this.client.get(this.url, {
        headers: this.headers
      });
      const $ = cheerio.load(response.data);
      const csrfToken = $('meta[name="csrf-token"]').attr("content");
      if (!csrfToken) throw new Error("CSRF token not found");
      return csrfToken;
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      throw error;
    }
  }
  async sendRequest({
    userId: uid = this.data.uid,
    zoneId: zone = this.data.zone
  }) {
    try {
      const csrfToken = await this.getCsrfToken();
      const response = await this.client.post(this.url, {
        uid: uid,
        zone: zone
      }, {
        headers: {
          ...this.headers,
          "x-csrf-token": csrfToken
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error during request:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const gempay = new GempayTopup();
  try {
    const data = await gempay.sendRequest(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}