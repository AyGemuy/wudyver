import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class IPVoid {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
  }
  async fetchSource({
    url: targetUrl
  }) {
    const endpoint = "https://www.apivoid.com/tools/view-html-page-source/";
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://www.apivoid.com",
      pragma: "no-cache",
      priority: "u=0, i",
      referer: "https://www.apivoid.com/tools/view-html-page-source/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    const data = new URLSearchParams({
      url: targetUrl
    });
    try {
      const res = await this.client.post(endpoint, data, {
        headers: headers
      });
      const $ = cheerio.load(res.data);
      const htmlContent = $("#resultText").text().trim();
      if (!htmlContent) throw new Error("Tidak ada hasil ditemukan");
      return htmlContent;
    } catch (err) {
      console.error("❌ IPVoid Error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).send("URL is required");
  }
  try {
    const ipvoid = new IPVoid();
    const result = await ipvoid.fetchSource(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    console.error("❌ Handler Error:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}