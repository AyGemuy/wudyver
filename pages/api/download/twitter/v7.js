import fetch from "node-fetch";
import * as cheerio from "cheerio";
class TwitterSaver {
  constructor() {
    this.baseUrl = "https://twittersaver.net/api/ajaxSearch";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      Referer: "https://twittersaver.net/id"
    };
  }
  async download({
    url
  }) {
    try {
      console.log(`[⏳] TwitterSaver Fetching: ${url}`);
      const bodyData = new URLSearchParams({
        q: url,
        lang: "id",
        cftoken: ""
      });
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        body: bodyData.toString()
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const jsonResponse = await response.json();
      if (jsonResponse.status !== "ok" || !jsonResponse.data) {
        throw new Error("Gagal mendapatkan data dari TwitterSaver");
      }
      const $ = cheerio.load(jsonResponse.data);
      const results = [];
      $(".download-box li").each((_, el) => {
        const thumbnail = $(el).find(".download-items__thumb img").attr("src");
        const downloadUrl = $(el).find(".download-items__btn a").attr("href");
        const typeText = $(el).find(".download-items__btn a span span").text().trim() || "Download";
        if (downloadUrl) {
          results.push({
            type: typeText.includes("Gambar") ? "image" : "video",
            text: typeText,
            thumbnail: thumbnail,
            url: downloadUrl
          });
        }
      });
      const twitterId = $("#TwitterId").val();
      return {
        status: "success",
        source: "TwitterSaver",
        twitterId: twitterId,
        results: results
      };
    } catch (error) {
      console.error("[❌] TwitterSaver Error:", error.message);
      return {
        status: "error",
        message: error.message
      };
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
  const api = new TwitterSaver();
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