import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class TwTube {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      baseURL: "https://twtube.app",
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        referer: "https://twtube.app/en1/",
        origin: "https://twtube.app"
      }
    }));
  }
  async download({
    url: twitterUrl
  }) {
    try {
      const homePage = await this.client.get("/en1/");
      const $home = cheerio.load(homePage.data);
      const csrfToken = $home('input[name="csrf_token"]').val();
      if (!csrfToken) {
        throw new Error("Gagal mengekstrak CSRF Token dari halaman utama.");
      }
      const postData = qs.stringify({
        csrf_token: csrfToken,
        url: twitterUrl
      });
      const response = await this.client.post("/en1/download", postData, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const $ = cheerio.load(response.data);
      const results = {
        title: $("h1").text().trim(),
        thumbnail: $(".square-box-img img").attr("src"),
        media: []
      };
      $(".square-box").each((i, el) => {
        const downloadLink = $(el).find("a.btn-custom").attr("href");
        const label = $(el).find(".square-box-btn span").text().trim();
        if (downloadLink) {
          results.media.push({
            quality: label || "Original",
            url: downloadLink.startsWith("http") ? downloadLink : `https://twtube.app${downloadLink}`
          });
        }
      });
      if (results.media.length === 0) {
        return {
          status: "error",
          message: "Konten tidak ditemukan atau URL salah."
        };
      }
      return {
        status: "success",
        source: "TwTube",
        data: results
      };
    } catch (error) {
      return {
        status: "error",
        message: error.response?.status === 403 ? "CSRF Error/Session Expired" : error.message
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
  const api = new TwTube();
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