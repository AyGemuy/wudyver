import axios from "axios";
import * as cheerio from "cheerio";
class AioDl {
  constructor(url) {
    this.url = url;
    this.apiUrl = "https://vget.xyz/dl";
    this.headers = {
      authority: "vget.xyz",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "null",
      pragma: "no-cache",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15"
    };
  }
  async download() {
    try {
      const payload = new URLSearchParams({
        url: this.url
      });
      const {
        data: html
      } = await axios.post(this.apiUrl, payload.toString(), {
        headers: this.headers
      });
      return this.parse(cheerio.load(html));
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  parse($) {
    const result = {};
    $(".dl-horizontal dt").each((i, el) => {
      const key = $(el).text().replace(":", "").trim().toLowerCase().replace(/\s+/g, "");
      const value = $(el).next("dd").text().trim();
      if (key && value) result[key] = value;
    });
    const bestDownload = $(".dl-horizontal dd button[data]");
    if (bestDownload.length) {
      result["best"] = {
        ext: bestDownload.text().trim().split(" ").pop().replace(/[^\w\s]/g, "").trim() || "unknown",
        url: bestDownload.attr("data") || "unavailable"
      };
    }
    result["formats"] = [];
    $(".table-hover tbody tr").each((i, el) => {
      const cells = $(el).find("td");
      if (cells.length >= 3) {
        const format = $(cells[0]).text().trim().split(" ").pop().replace(/[^\w\s]/g, "").trim();
        const size = $(cells[1]).text().trim();
        const extension = $(cells[2]).text().trim();
        const downloadLink = $(cells[3]).find("button[data]").attr("data");
        if (downloadLink) result["formats"].push({
          quality: format,
          size: size,
          ext: extension,
          url: downloadLink
        });
      }
    });
    return result;
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const aiodl = new AioDl(url);
    const result = await aiodl.download();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}