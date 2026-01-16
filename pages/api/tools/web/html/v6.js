import axios from "axios";
import * as cheerio from "cheerio";
class HtmlValidator {
  constructor() {
    this.baseUrl = "https://validator.nu/";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=0, i",
      referer: "https://validator.nu/",
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
  async download({
    url
  }) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const validateUrl = `${this.baseUrl}?showsource=yes&doc=${encodedUrl}`;
      const response = await axios.get(validateUrl, {
        headers: this.headers
      });
      return this.extractSourceCode(response.data);
    } catch (error) {
      return error.response?.data || error.message;
    }
  }
  extractSourceCode(html) {
    const $ = cheerio.load(html);
    const sourceCode = [];
    $("ol.source li code:not(.lf)").each((_, el) => {
      sourceCode.push($(el).text());
    });
    return sourceCode.length ? sourceCode.join("\n") : html;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new HtmlValidator();
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