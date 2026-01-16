import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class AlleasySeo {
  constructor() {
    this.baseUrl = "https://alleasyseo.com/get-source-code-of-webpage/output";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://alleasyseo.com",
      referer: "https://alleasyseo.com/get-source-code-of-webpage",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url
  }) {
    try {
      const data = qs.stringify({
        url: url,
        submit: "Get Source Code"
      });
      const response = await this.client.post(this.baseUrl, data, {
        headers: this.headers,
        responseType: "text"
      });
      return this.extractSourceCode(response.data);
    } catch (error) {
      return error.response?.data || error.message;
    }
  }
  extractSourceCode(html) {
    const $ = cheerio.load(html);
    const code = $("textarea#textArea").text();
    return code ? code.trim() : html;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new AlleasySeo();
  try {
    const result = await api.download(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}