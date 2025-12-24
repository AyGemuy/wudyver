import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class TeraboxDownloader {
  constructor() {
    this.urlFixer = "https://terabox-url-fixer.mohdamir7505.workers.dev/?url=";
    this.client = wrapper(axios.create({
      baseURL: "https://teraboxdownloader.tools/",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://teraboxdownloader.tools",
        referer: "https://teraboxdownloader.tools/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      },
      jar: new CookieJar(),
      withCredentials: true
    }));
  }
  async download({
    url
  }) {
    try {
      const {
        data
      } = await this.client.post("/", new URLSearchParams({
        url: url
      }));
      const $ = cheerio.load(data);
      return $(".res_item").map((_, el) => ({
        img: $(el).find(".res_imgw").attr("src") || "",
        title: $(el).find("h3").text() || "No Title",
        size: $(el).find(".res_size").text() || "Unknown Size",
        download: this.urlFixer + ($(el).find(".btn_down").attr("href") || ""),
        fastDownload: this.urlFixer + ($(el).find(".fbtn_down").attr("href") || "")
      })).get();
    } catch (error) {
      throw new Error(error.message);
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
  const api = new TeraboxDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}