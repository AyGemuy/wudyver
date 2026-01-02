import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import FormData from "form-data";
class SnapSaveTwitter {
  constructor() {
    this.baseUrl = "https://twitterdownloader.snapsave.app";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Origin: this.baseUrl,
        Referer: this.baseUrl + "/id2"
      }
    }));
  }
  async _getInitialToken() {
    try {
      const {
        data
      } = await this.client.get(`${this.baseUrl}/id2`);
      const $ = cheerio.load(data);
      const token = $('input[name="token"]').val();
      return token;
    } catch (error) {
      console.error("[❌] Failed to fetch token:", error.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log(`[⏳] Step 1: Getting Token...`);
      const token = await this._getInitialToken();
      if (!token) throw new Error("Could not extract token from SnapSave");
      console.log(`[⏳] Step 2: Fetching Data with Token: ${token}`);
      const form = new FormData();
      form.append("url", url);
      form.append("token", token);
      const response = await this.client.post(`${this.baseUrl}/action.php`, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      const jsonResponse = response.data;
      if (jsonResponse.error || !jsonResponse.data) {
        throw new Error(jsonResponse.message || "Gagal mengambil data");
      }
      return this._parseHtml(jsonResponse.data);
    } catch (error) {
      console.error("[❌] SnapSave Error:", error.message);
      return {
        status: "error",
        message: error.message
      };
    }
  }
  _parseHtml(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const results = [];
    const thumbnail = $(".videotikmate-left img").attr("src");
    const author = $(".videotikmate-middle h1 a").text().trim();
    const description = $(".videotikmate-middle p span").text().trim();
    $(".abuttons a").each((_, el) => {
      const href = $(el).attr("href");
      let text = $(el).find("span span").text().trim();
      if (!text) text = $(el).text().trim();
      if (href && href !== "#") {
        results.push({
          text: text,
          url: href
        });
      }
    });
    return {
      status: "success",
      source: "SnapSave",
      metadata: {
        author: author,
        description: description,
        thumbnail: thumbnail
      },
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
  const api = new SnapSaveTwitter();
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