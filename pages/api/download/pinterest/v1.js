import axios from "axios";
import * as cheerio from "cheerio";

class Pinterest {
  constructor() {
    this.baseHtml = `https://${process.env.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }

  async download(url) {
    try {
      const { data } = await axios.get(this.baseHtml + url);
      const $ = cheerio.load(data);
      const thirdScript = $('script[data-relay-response="true"][type="application/json"][data-preloaded="true"]')?.toArray()?.pop();
      return thirdScript ? JSON.parse(thirdScript.children[0]?.data)?.response.data : null;
    } catch (error) {
      throw new Error('Script ketiga tidak ditemukan atau terjadi kesalahan.');
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
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}