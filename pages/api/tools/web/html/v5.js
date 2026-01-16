import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import qs from "qs";
import * as cheerio from "cheerio";
class WebSniffer {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.baseUrl = "https://website-development.ch/tools/web-sniffer";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://website-development.ch",
      priority: "u=0, i",
      referer: "https://website-development.ch/tools/web-sniffer",
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
  }
  async getCsrfToken() {
    try {
      await this.client.get(this.baseUrl, {
        headers: this.headers
      });
      const cookies = this.jar.getCookiesSync(this.baseUrl);
      const csrfToken = cookies.find(cookie => cookie.key === "__csrf__")?.value || "";
      return {
        csrfToken: csrfToken,
        cookies: cookies.map(c => `${c.key}=${c.value}`).join("; ")
      };
    } catch (error) {
      return {
        csrfToken: "",
        cookies: ""
      };
    }
  }
  async download({
    url,
    method = "GET",
    body = "",
    ...rest
  }) {
    try {
      const {
        csrfToken,
        cookies
      } = await this.getCsrfToken();
      const data = qs.stringify({
        method: method,
        url: url,
        __csrf__: csrfToken || undefined,
        contentType: "application/json",
        body: body,
        headers: JSON.stringify({
          ...this.headers,
          Cookie: cookies
        }),
        scrollTop: 0,
        ...rest
      });
      const response = await this.client.post(this.baseUrl, data, {
        headers: {
          ...this.headers,
          Cookie: cookies
        }
      });
      return this.extractShowHtml(response.data);
    } catch (error) {
      return error.response?.data || error.message;
    }
  }
  extractShowHtml(html) {
    const $ = cheerio.load(html);
    return $("button:contains('Show HTML') + div.data-container pre code").text() || html;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new WebSniffer();
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