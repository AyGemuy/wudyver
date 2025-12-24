import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookieJar
} from "axios-cookiejar-support";
import axios from "axios";
import * as cheerio from "cheerio";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const H = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=0, i",
  referer: "https://www.google.com/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "cross-site",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "user-agent": UA
};
class TeraboxDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.ax = axiosCookieJar(axios.create({
      jar: this.jar,
      headers: {
        "user-agent": UA
      }
    }));
  }
  async download({
    url,
    ...r
  } = {}) {
    try {
      console.log("1. get home");
      const h = await this.ax.get("https://www.playertera.com/", {
        headers: H
      });
      const $ = cheerio.load(h.data);
      const t = $('meta[name="csrf-token"]').attr("content") ?? (() => {
        throw new Error("no csrf");
      })();
      console.log("csrf:", t);
      console.log("2. post api");
      const ah = {
        accept: "application/json",
        "content-type": "application/json",
        origin: "https://www.playertera.com",
        referer: "https://www.playertera.com/",
        "x-csrf-token": t,
        ...H
      };
      const d = await this.ax.post("https://www.playertera.com/api/process-terabox", {
        url: url,
        ...r
      }, {
        headers: ah
      });
      console.log("ok:", d.status);
      const res = d.data ?? {};
      console.log("result:", JSON.stringify(res, null, 2));
      return res;
    } catch (e) {
      console.error("err:", e?.message || e);
      throw e;
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