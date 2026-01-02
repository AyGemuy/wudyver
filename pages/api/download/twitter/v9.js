import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class SnapTwitter {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      baseURL: "https://snaptwitter.com",
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        referer: "https://snaptwitter.com/en2",
        origin: "https://snaptwitter.com"
      }
    }));
  }
  async download({
    url: twitterUrl
  }) {
    try {
      const home = await this.client.get("/en2");
      const $home = cheerio.load(home.data);
      let token = $home("#token").val() || $home('input[name="token"]').val();
      if (!token) {
        const scriptContent = $home("script").text();
        const tokenMatch = scriptContent.match(/token["']\s*,\s*["']([^"']+)["']/);
        token = tokenMatch ? tokenMatch[1] : null;
      }
      if (!token) throw new Error("Gagal mendapatkan token keamanan.");
      const form = new FormData();
      form.append("url", twitterUrl);
      form.append("token", token);
      const response = await this.client.post("/action.php", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      if (response.data.error) {
        throw new Error(response.data.message || "Request ditolak oleh SnapTwitter.");
      }
      const $ = cheerio.load(response.data.data);
      const results = {
        title: $(".videotikmate-middle h1").text().trim(),
        description: $(".videotikmate-middle p span").text().trim(),
        thumbnail: $(".videotikmate-left img").attr("src"),
        media: []
      };
      $(".abutton").each((i, el) => {
        const link = $(el).attr("href");
        const text = $(el).find("span").first().text().trim();
        if (link && link !== "#") {
          results.media.push({
            type: text,
            url: link
          });
        }
      });
      return {
        status: "success",
        source: "SnapTwitter",
        data: results
      };
    } catch (error) {
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
  const api = new SnapTwitter();
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