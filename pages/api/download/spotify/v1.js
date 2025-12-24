import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const HOSTS = {
  1: "spotymate.com",
  2: "spotymp3.app"
};
class SpotyAPI {
  constructor(host = "spotymp3.app") {
    this.baseUrl = `https://${host}`;
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      connection: "keep-alive",
      "content-type": "application/json",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async download(url) {
    try {
      const metadataResponse = await this.client.post(`${this.baseUrl}/api/get-metadata`, {
        url: url
      }, {
        headers: this.headers
      });
      const downloadResponse = await this.client.post(`${this.baseUrl}/api/download-track`, {
        url: url
      }, {
        headers: this.headers
      });
      return {
        ...metadataResponse.data,
        ...downloadResponse.data
      };
    } catch (error) {
      console.error("Error in download operation:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    host
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const selectedHost = HOSTS[Number(host)] || "spotymp3.app";
  const spotyAPI = new SpotyAPI(selectedHost);
  try {
    const result = await spotyAPI.download(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the request."
    });
  }
}