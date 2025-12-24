import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class AdLift {
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
    const endpoint = "https://www.adlift.com/seo-tools/source-code-viewer-output/";
    const headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://www.adlift.com",
      Pragma: "no-cache",
      Referer: "https://www.adlift.com/seo-tools/source-code-viewer/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
    const data = new URLSearchParams({
      url: targetUrl,
      submit: "Get Source Code"
    });
    try {
      const res = await this.client.post(endpoint, data, {
        headers: headers
      });
      const $ = cheerio.load(res.data);
      const htmlContent = $("#textArea").text().trim();
      if (!htmlContent) throw new Error("Tidak ada hasil ditemukan");
      return htmlContent;
    } catch (err) {
      console.error("❌ AdLift Error:", err.message);
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
    const adlift = new AdLift();
    const result = await adlift.fetchSource(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    console.error("❌ Handler Error:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}