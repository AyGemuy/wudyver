import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
class GlitXCore {
  constructor() {
    this.baseUrl = "https://glitx.com";
    this.password = "hafndauowfkjasasdfn";
    this.iterations = 100;
  }
  encrypt(msg, pwd) {
    const salt = CryptoJS.lib.WordArray.random(32);
    const key = CryptoJS.PBKDF2(pwd, salt, {
      keySize: 8,
      iterations: this.iterations,
      hasher: CryptoJS.algo.SHA1
    });
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(msg, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const result = salt.concat(iv).concat(CryptoJS.enc.Base64.parse(encrypted.toString()));
    return CryptoJS.enc.Base64.stringify(result);
  }
  async fetch(url) {
    try {
      const token = this.encrypt(url.slice(0, 1500), this.password);
      const res = await axios.post(`${this.baseUrl}/ajaxCore.php`, `token=${encodeURIComponent(token)}&hash=hashpin535&lang=en`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      return res.data;
    } catch {
      throw new Error("Fetch failed");
    }
  }
  parse(html) {
    try {
      const $ = cheerio.load(html);
      const res = {
        title: "",
        publisher: "",
        desc: "",
        duration: "",
        image: "",
        animated: "",
        frame: "",
        media: []
      };
      $("strong").each((_, el) => {
        const label = $(el).text().toLowerCase();
        const val = $(el)[0].nextSibling?.nodeValue?.trim() || "";
        if (label.includes("title")) res.title = val;
        if (label.includes("publisher")) res.publisher = val;
        if (label.includes("duration")) res.duration = val;
      });
      const container = $(".d-flex.flex-column.flex-md-row");
      res.desc = container.find("strong").parent().text().trim();
      res.image = container.find("img").attr("src") || "";
      const links = container.find("a.btn-info");
      links.each((_, el) => {
        let url = $(el).attr("href") || "";
        if (url.startsWith("/")) url = this.baseUrl + url;
        const label = $(el).text().toLowerCase();
        const parent = $(el).parent().text();
        const quality = parent.match(/\d{2,5}x\d{2,5}/)?.[0] || "";
        const item = {
          url: url,
          quality: quality
        };
        if (label.includes("animated")) res.animated = url;
        else if (label.includes("first frame")) res.frame = url;
        else res.media.push(item);
      });
      return res;
    } catch {
      throw new Error("Parse failed");
    }
  }
  async getInfo({
    url
  }) {
    try {
      const html = await this.fetch(url);
      return this.parse(html);
    } catch (e) {
      return {
        error: true,
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const glx = new GlitXCore();
    const result = await glx.getInfo(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}