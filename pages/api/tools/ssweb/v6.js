import axios from "axios";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class WebToPNG {
  constructor() {
    this.baseURL = "https://www.webtoptools.com";
    this.apiURL = `${this.baseURL}/action/pdfapi/url_to_png.php`;
  }
  async generate({
    url
  } = {}) {
    const targetUrl = url ?? "https://x.com";
    console.log("[start] generating PNG from:", targetUrl);
    try {
      const response = await axios.get(this.apiURL, {
        params: {
          theurl: targetUrl
        },
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Pragma: "no-cache",
          Referer: "https://www.webtoptools.com/image/url-to-png/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          ...SpoofHead()
        },
        timeout: 3e4
      });
      const html = response.data;
      const $ = cheerio.load(html);
      const downloadBtn = $('a.btn-danger[href$=".png"]');
      const downloadUrl = downloadBtn.attr("href");
      const result = {
        url: null,
        success: false,
        message: "",
        rawHtml: html
      };
      if (downloadUrl) {
        result.url = downloadUrl.startsWith("http") ? downloadUrl : this.baseURL + downloadUrl.replace(/^\//, "/");
        result.success = true;
        result.message = "PNG generated successfully";
      } else {
        result.message = "Download link not found in response";
        console.warn("[warn] No PNG link found");
      }
      return result;
    } catch (error) {
      console.error("[exception]", error?.response?.status ?? error?.code ?? error.message);
      return {
        url: null,
        success: false,
        message: error?.response?.data || error.message || "Request failed",
        rawHtml: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new WebToPNG();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}