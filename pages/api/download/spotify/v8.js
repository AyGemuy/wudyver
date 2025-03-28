import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
class SpotidownAPI {
  constructor() {
    this.baseUrl = "https://spotidown.app";
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.cookieJar
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: this.baseUrl + "/",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async getHiddenFormData() {
    try {
      console.log("Mengambil form data dari halaman utama...");
      const {
        data
      } = await this.client.get(this.baseUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(data);
      const hiddenInputs = {};
      $('form[name="spotifyurl"] input[type="hidden"]').each((_, el) => {
        hiddenInputs[$(el).attr("name")] = $(el).attr("value") || "";
      });
      return hiddenInputs;
    } catch (error) {
      console.error("Gagal mengambil form data:", error);
      return null;
    }
  }
  async download(url) {
    try {
      const hiddenData = await this.getHiddenFormData();
      if (!hiddenData) throw new Error("Gagal mengambil form data.");
      console.log("Mengirim permintaan unduhan...");
      const formData = new FormData();
      formData.append("url", url);
      Object.entries(hiddenData).forEach(([key, value]) => {
        formData.append(key, value);
      });
      const {
        data
      } = await this.client.post(`${this.baseUrl}/action`, formData, {
        headers: {
          ...this.headers
        }
      });
      return this.parseDownloadPage(data);
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      return null;
    }
  }
  parseDownloadPage(html) {
    try {
      const $ = cheerio.load(html);
      const title = $(".spotidown-downloader-middle h3 .hover-underline").text().trim();
      const artist = $(".spotidown-downloader-middle p span").text().trim();
      const cover = $(".spotidown-downloader-left img").attr("src");
      const mp3Link = $('.spotidown-downloader-right a:contains("Download Mp3")').attr("href");
      const coverLink = $('.spotidown-downloader-right a:contains("Download Cover [HD]")').attr("href");
      return {
        title: title || "Tidak ditemukan",
        artist: artist || "Tidak ditemukan",
        cover: cover || "Tidak ditemukan",
        mp3: mp3Link || "Tidak ditemukan",
        cover_hd: coverLink || "Tidak ditemukan"
      };
    } catch (error) {
      console.error("Gagal melakukan parsing:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const spotyAPI = new SpotidownAPI();
  try {
    const result = await spotyAPI.download(url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the request."
    });
  }
}