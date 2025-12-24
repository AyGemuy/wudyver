import axios from "axios";
import * as cheerio from "cheerio";
class FontSpace {
  constructor() {
    this.searchPage = "https://www.fontspace.com/search?q=";
    this.apiUrl = "https://www.fontspace.com/api/v3/all/search.json";
    this.downloadUrl = "https://www.fontspace.com/get/family/";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query = "",
    page
  }) {
    const q = encodeURIComponent(query);
    const searchUrl = this.searchPage + q;
    try {
      const res = await axios.get(searchUrl, {
        withCredentials: true
      });
      const $ = cheerio.load(res.data);
      const configScript = $("#config").html();
      const config = JSON.parse(configScript);
      const xsrfHeader = config.XsrfHeader;
      const {
        data
      } = await axios.get(`${this.apiUrl}?q=${q}${page ? `&page=${page}` : ""}`, {
        headers: {
          ...this.headers,
          referer: searchUrl,
          [xsrfHeader]: config.AntiForgeryToken
        }
      });
      return data;
    } catch (error) {
      console.error("Error:", error);
    }
  }
  async download({
    id
  }) {
    try {
      const response = await axios.get(`${this.downloadUrl}${id}`, {
        headers: this.headers,
        maxRedirects: 0
      });
      const redirectUrl = response.headers["location"];
      return redirectUrl;
    } catch (error) {
      console.error("Error:", error);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "search | download"
      }
    });
  }
  const fonts = new FontSpace();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await fonts[action](params);
        break;
      case "download":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await fonts[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | download`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}