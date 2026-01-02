import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class SaveTwitter {
  constructor() {
    this.baseUrl = "https://savetwitter.net/api/ajaxSearch";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://savetwitter.net",
        pragma: "no-cache",
        referer: "https://savetwitter.net/en4",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
  }
  async download({
    url
  }) {
    try {
      console.log(`[⏳] SaveTwitter Fetching: ${url}`);
      const bodyData = new URLSearchParams({
        q: url,
        lang: "en",
        cftoken: ""
      });
      const response = await this.client.post(this.baseUrl, bodyData.toString());
      const jsonResponse = response.data;
      if (jsonResponse.status !== "ok" || !jsonResponse.data) {
        throw new Error("Gagal mendapatkan data dari SaveTwitter");
      }
      return this._parseHtml(jsonResponse.data);
    } catch (error) {
      console.error("[❌] SaveTwitter Error:", error.message);
      return {
        status: "error",
        message: error.message
      };
    }
  }
  _parseHtml(htmlString) {
    const $ = cheerio.load(htmlString);
    const results = [];
    const twitterId = $("#TwitterId").val();
    $(".download-box li").each((_, el) => {
      const thumb = $(el).find(".download-items__thumb img").attr("src");
      const btn = $(el).find(".download-items__btn a");
      const downloadUrl = btn.attr("href");
      const title = btn.find("span span").text().trim();
      if (downloadUrl) {
        results.push({
          type: title.toLowerCase().includes("image") || title.includes("이미지") ? "image" : "video",
          title: title,
          thumbnail: thumb,
          url: downloadUrl
        });
      }
    });
    return {
      status: "success",
      source: "SaveTwitter",
      twitterId: twitterId,
      results: results
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
  const api = new SaveTwitter();
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