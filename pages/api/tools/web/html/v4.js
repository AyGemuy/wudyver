import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
class OneHitSniffer {
  constructor() {
    this.baseUrl = "https://www.1-hit.com/sniffer.htm";
    this.headers = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "max-age=0",
      Connection: "keep-alive",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: "_ga=GA1.1.2004250519.1739309147; SID=5c993552304406d95e02b0c6dd44b15b; _ga_W969H1J6TG=GS1.1.1739437002.2.1.1739437026.0.0.0",
      Origin: "https://www.1-hit.com",
      Referer: "https://www.1-hit.com/sniffer.htm",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async download({
    url,
    method = "GET",
    agent = "23",
    ...rest
  }) {
    try {
      const data = qs.stringify({
        action: "sniffer",
        request_url: url,
        x: "54",
        y: "39",
        user_agent: agent,
        request_method: method,
        ...rest
      });
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers,
        responseType: "text"
      });
      return this.extractPageSource(response.data);
    } catch (error) {
      return error.response?.data || error.message;
    }
  }
  extractPageSource(html) {
    const $ = cheerio.load(html);
    return $("xmp").html() || html;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new OneHitSniffer();
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