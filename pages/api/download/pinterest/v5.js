import axios from "axios";
import {
  FormData
} from "formdata-node";
import * as cheerio from "cheerio";
class ExpertsToolExtractor {
  constructor() {
    this.url = "https://www.expertstool.com/download-pinterest-video/";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      origin: "https://www.expertstool.com",
      referer: "https://www.expertstool.com/download-pinterest-video/"
    };
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
  async fetch(inputUrl) {
    const videoUrl = await this.getRedirect(inputUrl);
    try {
      const form = new FormData();
      form.append("url", videoUrl);
      const {
        data
      } = await axios.post(this.url, form, {
        headers: {
          ...this.headers,
          ...form.headers
        }
      });
      return this.extract(data);
    } catch {
      return [];
    }
  }
  extract(html) {
    const $ = cheerio.load(html);
    return $(".table-responsive tbody tr").map((_, row) => {
      const link = $(row).find("td a[href^='https']").attr("href");
      const format = $(row).find("td:nth-child(3)").text().trim();
      return link ? {
        type: format.toLowerCase(),
        url: link
      } : null;
    }).get();
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const extractor = new ExpertsToolExtractor();
  try {
    const data = await extractor.fetch(params.url);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}