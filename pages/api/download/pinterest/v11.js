import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class PinDL {
  constructor() {
    this.base = "https://pindown.io";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
      }
    }));
  }
  log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
  }
  async _getToken() {
    try {
      this.log("Init session & fetching token...");
      const {
        data
      } = await this.client.get(`${this.base}/en`);
      const $ = cheerio.load(data);
      const token = $("form input").map((i, el) => {
        const n = $(el).attr("name"),
          v = $(el).val();
        return n && v && !["url", "lang"].includes(n) ? {
          key: n,
          val: v
        } : null;
      }).get()[0];
      if (!token) throw new Error("Token key not found in HTML");
      this.log(`Token found: [${token.key}]`);
      return token;
    } catch (e) {
      throw new Error(`Init failed: ${e.message}`);
    }
  }
  _parse(html) {
    const $ = cheerio.load(html);
    return {
      meta: {
        title: $(".media-content strong").first().text().trim() || "No Title",
        desc: $(".video-des").text().trim() || "",
        thumb: $(".media-left img").attr("src") || ""
      },
      files: $("tbody tr").map((i, el) => {
        const $td = $(el).find("td");
        const label = $td.eq(0).text().trim();
        const $btn = $td.eq(1).find("a");
        const href = $btn.attr("href");
        if (!href || href.includes("play.google.com")) return null;
        return {
          type: /cover|image/i.test(label) ? "image" : "video",
          quality: label,
          url: href,
          direct: /direct/i.test($btn.text())
        };
      }).get()
    };
  }
  async download({
    url,
    lang = "en"
  }) {
    try {
      this.log(`Processing: ${url}`);
      const t = await this._getToken();
      const f = new FormData();
      f.append("url", url);
      f.append(t.key, t.val);
      f.append("lang", lang);
      this.log("Sending request...");
      const {
        data
      } = await this.client.post(`${this.base}/action`, f, {
        headers: {
          ...f.getHeaders(),
          Origin: this.base,
          Referer: `${this.base}/en`
        }
      });
      if (!data.success) throw new Error(data.message || "Failed to resolve URL");
      this.log("Parsing result...");
      const res = this._parse(data.html);
      if (!res.files.length) throw new Error("No media links found");
      this.log(`Done. Found ${res.files.length} files.`);
      return {
        status: true,
        ...res
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        status: false,
        msg: e.message
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
  const api = new PinDL();
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