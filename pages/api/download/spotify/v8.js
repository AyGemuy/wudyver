import axios from "axios";
import {
  FormData
} from "formdata-node";
import crypto from "crypto";
import * as cheerio from "cheerio";
class Spotidown {
  constructor() {
    this.baseURL = "https://spotidown.app";
    this.cookies = "";
    this.client = axios.create();
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        this.cookies = setCookie.map(cookie => cookie.split(";")[0]).join("; ");
        console.log("[✓] Cookies updated:", this.cookies);
      }
      return response;
    });
  }
  async getFormValues() {
    try {
      console.log("[~] Mengambil halaman utama...");
      const response = await this.client.get(this.baseURL);
      const html = response.data;
      const $ = cheerio.load(html);
      const hiddenInputs = {};
      $('form[name="spotifyurl"] input[type="hidden"]').each((i, el) => {
        const name = $(el).attr("name");
        const value = $(el).attr("value") || "";
        if (name) hiddenInputs[name] = value;
      });
      console.log("[✓] Hidden form values:", hiddenInputs);
      return hiddenInputs;
    } catch (err) {
      console.error("[x] Gagal mengambil form:", err.message);
      throw err;
    }
  }
  async getRecaptchaResponse() {
    try {
      console.log("[~] Mengambil token reCAPTCHA (placeholder)...");
      const token = crypto.randomBytes(128).toString("hex");
      console.log("[✓] Token reCAPTCHA:", token.slice(0, 20), "...");
      return token;
    } catch (err) {
      console.error("[x] Gagal mendapatkan reCAPTCHA:", err.message);
      throw err;
    }
  }
  async download({
    url: spotifyUrl
  }) {
    try {
      console.log("[~] Memulai proses download untuk:", spotifyUrl);
      const hiddenValues = await this.getFormValues();
      const formData = new FormData();
      formData.append("url", spotifyUrl);
      for (const [key, value] of Object.entries(hiddenValues)) {
        formData.append(key, value);
      }
      const recaptchaResponse = await this.getRecaptchaResponse();
      formData.append("g-recaptcha-response", recaptchaResponse);
      console.log("[~] Mengirim permintaan ke /action...");
      const response = await this.client.post(`${this.baseURL}/action`, formData, {
        headers: {
          ...formData.headers,
          cookie: this.cookies,
          referer: this.baseURL,
          origin: this.baseURL,
          "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("[✓] Respon diterima:", typeof response.data === "object" ? response.data : response.data?.slice(0, 200));
      const html = response.data;
      const $ = cheerio.load(html);
      const box = $(".row.dlvideos").eq(0);
      return {
        title: box.find(".spotidown-downloader-middle h3 div").text().trim() || "",
        artist: box.find(".spotidown-downloader-middle p span").text().trim() || "",
        image: box.find(".spotidown-downloader-left img").attr("src") || "",
        downloads: box.find(".spotidown-downloader-right .abuttons a").map((_, el) => ({
          text: $(el).find("span span").text().trim() || "",
          url: $(el).attr("href") || ""
        })).get()
      };
    } catch (error) {
      console.error("[x] Gagal download:", error.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const spotyAPI = new Spotidown();
  try {
    const result = await spotyAPI.download(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "An error occurred while processing the request."
    });
  }
}