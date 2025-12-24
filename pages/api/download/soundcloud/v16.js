import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class SCloud {
  constructor() {
    this.base = "https://www.scloudme.com";
    this.cookieJar = {};
    this.http = axios.create({
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; Mobile Safari/537.36)"
      }
    });
  }
  async init() {
    try {
      const res = await this.http.get(`${this.base}/en4E/`, {
        headers: {
          referer: this.base
        }
      });
      const setCookie = res.headers["set-cookie"];
      if (setCookie) setCookie.forEach(c => {
        const [k, v] = c.split(";")[0].split("=");
        this.cookieJar[k] = v;
      });
      return this.parseForm(res.data);
    } catch (e) {
      console.error("init error:", e.message);
      throw e;
    }
  }
  parseForm(html) {
    try {
      const $ = cheerio.load(html);
      return {
        downloader_verify: $('input[name="downloader_verify"]').val(),
        _wp_http_referer: $('input[name="_wp_http_referer"]').val()
      };
    } catch (e) {
      console.error("parseForm error:", e.message);
      throw e;
    }
  }
  async submitUrl(url) {
    try {
      const {
        downloader_verify,
        _wp_http_referer
      } = await this.init();
      const body = new URLSearchParams({
        downloader_verify: downloader_verify,
        _wp_http_referer: _wp_http_referer,
        url: url
      }).toString();
      const res = await this.http.post(`${this.base}/download`, body, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          referer: `${this.base}/en4E/`,
          cookie: Object.entries(this.cookieJar).map(([k, v]) => `${k}=${v}`).join("; ")
        },
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      return this.parseInfo(res.data);
    } catch (e) {
      console.error("submitUrl error:", e.message);
      throw e;
    }
  }
  parseInfo(html) {
    try {
      const $ = cheerio.load(html);
      const area = $("#soundcloud-area");
      return {
        title: area.find("h3").text().trim(),
        image: area.find("img").attr("src"),
        form: {
          _nonce: area.find('input[name="_nonce"]').val(),
          _wp_http_referer: area.find('input[name="_wp_http_referer"]').val(),
          action: area.find('input[name="action"]').val(),
          title: area.find('input[name="title"]').val(),
          yt: area.find('input[name="yt"]').val()
        }
      };
    } catch (e) {
      console.error("parseInfo error:", e.message);
      throw e;
    }
  }
  async getLink(info) {
    try {
      const body = new URLSearchParams(info.form).toString();
      const res = await this.http.post(`${this.base}/sc.php`, body, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          referer: `${this.base}/download`,
          cookie: Object.entries(this.cookieJar).map(([k, v]) => `${k}=${v}`).join("; ")
        },
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      return {
        title: info.title,
        image: info.image,
        url: res.request.res.responseUrl || `${this.base}/sc.php`,
        data: Buffer.isBuffer(res.data) ? res.data : Buffer.from(res.data)
      };
    } catch (e) {
      console.error("getLink error:", e.message);
      throw e;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("processing:", url);
      const info = await this.submitUrl(url);
      const file = await this.getLink(info);
      const mediaUrl = file.data;
      return {
        meta: {
          title: info.title,
          artist: this.artist(info.title),
          image: info.image
        },
        downloads: mediaUrl.toString("base64")
      };
    } catch (e) {
      console.error("download error:", e.message);
      throw e;
    }
  }
  artist(title) {
    const parts = title.split("-").map(s => s.trim());
    return parts[1] || "-";
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const downloader = new SCloud();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}