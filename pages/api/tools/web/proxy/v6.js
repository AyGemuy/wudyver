import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class ReqBinAPI {
  constructor() {
    this.apiUrl = "https://apius.reqbin.com/api/v1/requests";
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "*/*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-SesId": Date.now().toString(),
      "X-DevId": this.generateRandomId(),
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://reqbin.com/post-online"
    };
  }
  generateRandomId() {
    return (Math.random().toString(36).substr(2, 9) + Date.now().toString(36)).toUpperCase();
  }
  async sendRequest(url, method, body = {}, headers = {}) {
    if (!url || !method) {
      throw new Error("Missing required fields: url and method");
    }
    const defaultData = {
      id: "0",
      parentId: "",
      histKey: this.generateRandomId(),
      name: "",
      changed: false,
      errors: "",
      json: JSON.stringify({
        method: method,
        url: url,
        contentType: "JSON",
        content: JSON.stringify(body),
        headers: JSON.stringify(headers)
      }),
      sessionId: Date.now(),
      deviceId: this.generateRandomId()
    };
    try {
      const response = await this.client.post(this.apiUrl, defaultData, {
        headers: this.defaultHeaders
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    body,
    method,
    headers
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: 'Paramenter "url" wajib disertakan.'
    });
  }
  const api = new ReqBinAPI();
  try {
    const data = await api.sendRequest(url, method, body, headers);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}