import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class ApiService {
  constructor() {
    this.apiUrl = "https://www.free-api.com/urltask";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create());
    this.client.defaults.jar = this.jar;
    this.client.defaults.withCredentials = true;
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getCsrfToken(fzsid) {
    try {
      const refererUrl = `https://www.free-api.com/use/${fzsid}`;
      const response = await this.client.get(refererUrl, {
        headers: {
          ...this.headers,
          Referer: refererUrl
        }
      });
      const $ = cheerio.load(response.data);
      const csrfToken = $('meta[name="_token"]').attr("content");
      return csrfToken;
    } catch (error) {
      return null;
    }
  }
  async sendRequest({
    fzsid = "652",
    ...params
  }, csrfToken = "") {
    if (!csrfToken) {
      csrfToken = await this.getCsrfToken(fzsid);
      if (!csrfToken) {
        throw new Error("CSRF token could not be retrieved");
      }
    }
    try {
      const payload = new URLSearchParams({
        fzsid: fzsid,
        ...params
      }).toString();
      const refererUrl = `https://www.free-api.com/use/${fzsid}`;
      const response = await this.client.post(this.apiUrl, payload, {
        headers: {
          ...this.headers,
          "X-CSRF-TOKEN": csrfToken,
          Referer: refererUrl
        }
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    fzsid = "652", ...params
  } = req.method === "POST" ? req.body : req.query;
  try {
    const apiService = new ApiService();
    const result = await apiService.sendRequest({
      fzsid: fzsid,
      ...params
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}