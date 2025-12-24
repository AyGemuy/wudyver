import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class KolIdDownloader {
  constructor() {
    this.url = "https://kol.id/download-video/instagram";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
  }
  async getToken() {
    try {
      const {
        data,
        headers
      } = await this.client.get(this.url);
      const $ = cheerio.load(data);
      const token = $('input[name="_token"]').attr("value");
      const xsrfToken = headers["set-cookie"]?.find(cookie => cookie.includes("XSRF-TOKEN"))?.split(";")[0].split("=")[1];
      return {
        token: token,
        xsrfToken: xsrfToken,
        cookies: headers["set-cookie"]
      };
    } catch (error) {
      console.error("Error fetching token:", error);
      return null;
    }
  }
  async downloadVideo(instagramUrl) {
    try {
      const {
        token,
        xsrfToken,
        cookies
      } = await this.getToken();
      if (!token || !xsrfToken) throw new Error("Token not found");
      const response = await this.client.post(this.url, new URLSearchParams({
        url: instagramUrl,
        _token: token
      }).toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          cookie: cookies.join("; "),
          origin: "https://kol.id",
          referer: this.url,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
          "x-xsrf-token": decodeURIComponent(xsrfToken)
        }
      });
      const $ = cheerio.load(response.data.html);
      return {
        media: $(".btn-instagram.btn-primary").map((_, el) => ({
          url: $(el).attr("href")
        })).get(),
        title: $("#title-content-here h2").text().trim() || "",
        time: $(".time-details span").text().trim() || ""
      };
    } catch (error) {
      console.error("Error fetching video:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: 'Paramenter "url" wajib disertakan.'
  });
  const kol = new KolIdDownloader();
  try {
    const result = await kol.downloadVideo(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}