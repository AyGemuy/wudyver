import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TrevorFox {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true
    }));
  }
  async download({
    url: targetUrl
  }) {
    const endpoint = "https://trevorfox.com/view-source/";
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://trevorfox.com",
      pragma: "no-cache",
      priority: "u=0, i",
      referer: "https://trevorfox.com/tools/source-viewer/",
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
      const pre = $("pre").first();
      if (!pre || pre.length === 0) throw new Error("Tidak ada <pre> ditemukan");
      pre.find("span.line-number").remove();
      const textContent = pre.text().trim();
      if (!textContent) throw new Error("Tidak ada hasil ditemukan setelah pembersihan");
      const htmlContent = cheerio.load(textContent).html();
      return htmlContent;
    } catch (err) {
      console.error("❌ TrevorFox Error:", err && err.message ? err.message : err);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TrevorFox();
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