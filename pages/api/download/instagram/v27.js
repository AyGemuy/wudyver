import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import qs from "qs";
class SnapInstaVin {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://snapinsta.vin",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://snapinsta.vin/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.apiUrl = "https://snapinsta.vin/process";
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[SnapInstaVin] Processing URL: ${url}`);
      const html = await this.req(url);
      if (!html) throw new Error("Empty response from server");
      const data = this.parse(html);
      console.log(`[SnapInstaVin] Success: ${data.result.length} media found.`);
      return data;
    } catch (error) {
      console.error(`[SnapInstaVin] Error: ${error.message}`);
      return {
        result: [],
        status: false,
        message: error.message
      };
    }
  }
  async req(url) {
    try {
      const payload = qs.stringify({
        url: url
      });
      const {
        data
      } = await this.client.post(this.apiUrl, payload, {
        headers: this.headers
      });
      return data || null;
    } catch (error) {
      console.error("[SnapInstaVin] Request Failed:", error?.response?.status || error.message);
      return null;
    }
  }
  parse(html) {
    if (!html) return {
      status: false,
      result: []
    };
    const $ = cheerio.load(html);
    const results = [];
    let authorInfo = null;
    $(".download-item").each((i, el) => {
      const $el = $(el);
      const $mediaBox = $el.find(".media-box");
      const thumbnail = $mediaBox.find("img").attr("src");
      const downloadLink = $mediaBox.find(".download-bottom a").attr("href");
      if (!downloadLink) return;
      if (!authorInfo) {
        const $top = $el.find(".download-top .left");
        const avatar = $top.find("img").attr("src");
        const username = $top.text().replace($top.find("img").text(), "").trim();
        if (username) {
          authorInfo = {
            username: username,
            avatar: avatar || ""
          };
        }
      }
      const btnText = $mediaBox.find(".download-bottom a").text().toLowerCase();
      const type = btnText.includes("video") ? "video" : "image";
      results.push({
        type: type,
        url: downloadLink,
        thumbnail: thumbnail || ""
      });
    });
    return {
      status: results.length > 0,
      result: results,
      author: authorInfo || {},
      caption: null
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SnapInstaVin();
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