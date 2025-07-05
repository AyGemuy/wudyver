import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Pinterest {
  constructor() {
    this.baseHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }
  async getRedirect(url) {
    try {
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      return response.headers.location || url;
    } catch (error) {
      return error.response?.headers?.location || url;
    }
  }
  async download(inputUrl) {
    const url = await this.getRedirect(inputUrl);
    try {
      const {
        data
      } = await axios.get(this.baseHtml + url);
      const $ = cheerio.load(data);
      const thirdScript = $('script[data-relay-response="true"][type="application/json"][data-preloaded="true"]')?.toArray()?.pop();
      return thirdScript ? JSON.parse(thirdScript.children[0]?.data)?.response.data : null;
    } catch (error) {
      throw new Error("Script ketiga tidak ditemukan atau terjadi kesalahan.");
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "URL is required"
  });
  try {
    const downloader = new Pinterest();
    const result = await downloader.download(url);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}