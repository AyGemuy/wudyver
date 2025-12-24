import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class IPRequest {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
  }
  async sendRequest({
    url: inputUrl,
    method = "POST",
    body = "",
    headers: inputHeaders = ""
  }) {
    const requestUrl = "https://developer.iplocation.net/request-test";
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://developer.iplocation.net",
      priority: "u=0, i",
      referer: "https://developer.iplocation.net/request-test",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    const data = new URLSearchParams();
    data.append("url", inputUrl);
    data.append("requestType", method);
    data.append("token", "bearerToken");
    data.append("bearerToken", "");
    data.append("authUsr", "");
    data.append("authPwd", "");
    data.append("customTokn", "");
    data.append("inputContentType", "JSON");
    data.append("post_data", body);
    data.append("inputHeaders", inputHeaders);
    try {
      const response = await this.client.post(requestUrl, data, {
        headers: headers
      });
      const $ = cheerio.load(response.data);
      const rawJson = $("#result_content").text().trim();
      return JSON.parse(rawJson) || {
        data: null
      };
    } catch (error) {
      console.error("Error sending request:", error.message);
      throw new Error("Error occurred while sending request");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: 'Paramenter "url" wajib disertakan.'
    });
  }
  const proxyium = new IPRequest();
  try {
    const result = await proxyium.sendRequest(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: "Error occurred",
      error: error.message
    });
  }
}