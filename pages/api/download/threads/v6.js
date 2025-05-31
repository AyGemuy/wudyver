import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class Downloader {
  constructor() {
    this.apiHtml = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1`;
  }
  async download({
    url
  }) {
    try {
      const {
        data
      } = await axios.get(`${this.apiHtml}?url=${encodeURIComponent(url)}`);
      const $ = cheerio.load(data),
        meta = {},
        scripts = $("script").map((_, el) => $(el).html()).get();
      $("meta[property^='og:']").each((_, el) => meta[$(el).attr("property")] = $(el).attr("content"));
      const transcription = scripts.find(s => s.includes("transcription_data"));
      const result = transcription ? JSON.parse(transcription).require[0].pop()[0].__bbox.require[0].pop().pop().__bbox.result.data.data.edges[0].node.thread_items[0].post : null;
      return {
        meta: meta,
        data: result
      };
    } catch {
      return {
        error: "Fetch failed"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}