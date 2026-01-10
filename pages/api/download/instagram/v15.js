import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import qs from "qs";
class SnapInsta {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://snapinsta.to",
      referer: "https://snapinsta.to/id",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.apiUrl = "https://snapinsta.to/api";
  }
  async download({
    url
  }) {
    try {
      console.log(`[SnapInsta] Memproses URL: ${url}`);
      const token = await this.getToken(url);
      if (!token) throw new Error("Gagal mendapatkan token verifikasi.");
      const rawData = await this.getAjax(url, token);
      if (!rawData) throw new Error("Gagal mengambil data Ajax.");
      const decodedCode = this.decryptSnapInsta(rawData);
      const html = this.extractHtml(decodedCode);
      const data = this.parse(html);
      console.log(`[SnapInsta] Berhasil: ${data.result.length} media ditemukan.`);
      return data;
    } catch (error) {
      console.error(`[SnapInsta] Error: ${error.message}`);
      return {
        result: [],
        status: false,
        message: error.message
      };
    }
  }
  async getToken(url) {
    try {
      const {
        data
      } = await this.client.post(`${this.apiUrl}/userverify`, qs.stringify({
        url: url
      }), {
        headers: this.headers
      });
      return data?.token || null;
    } catch (e) {
      return null;
    }
  }
  async getAjax(url, token) {
    try {
      const payload = qs.stringify({
        q: url,
        t: "media",
        v: "v2",
        lang: "id",
        cftoken: token
      });
      const {
        data
      } = await this.client.post(`${this.apiUrl}/ajaxSearch`, payload, {
        headers: this.headers
      });
      return data?.data || null;
    } catch (e) {
      return null;
    }
  }
  decryptSnapInsta(code) {
    try {
      if (code.includes("eval(function(p,a,c,k,e,d)")) {
        return this.unPackStandard(code);
      } else if (code.includes("eval(function(h,u,n,t,e,r)")) {
        return this.unPackCustom(code);
      } else {
        return code;
      }
    } catch (e) {
      return code;
    }
  }
  unPackStandard(code) {
    const regex = /}\s*\(\s*(['"])(.*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])(.*?)\5\.split\(\s*(['"])\|?\7\s*\)/;
    const match = code.match(regex);
    if (!match) return code;
    const payload = match[2];
    const radix = parseInt(match[3]);
    const count = parseInt(match[4]);
    const keywords = match[6].split("|");
    const decodeBase = (str, base) => {
      const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (base <= 10) return parseInt(str);
      let val = 0;
      for (let i = 0; i < str.length; i++) val = val * base + chars.indexOf(str[i]);
      return val;
    };
    return payload.replace(/\b\w+\b/g, word => {
      const index = decodeBase(word, radix);
      return index < count && keywords[index] ? keywords[index] : word;
    });
  }
  unPackCustom(code) {
    const argsRegex = /\}\(\s*(['"])(.*?)\1\s*,\s*(\d+)\s*,\s*(['"])(.*?)\4\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\)/;
    const match = code.match(argsRegex);
    if (!match) return code;
    const h = match[2];
    const n = match[5];
    const t = parseInt(match[6]);
    const e = parseInt(match[7]);
    let result = "";
    let i = 0;
    const len = h.length;
    const separator = n[e];
    const convertBase = (str, baseStr) => {
      const baseLen = baseStr.length;
      const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split("");
      const baseMap = alphabet.slice(0, baseLen);
      return str.split("").reverse().reduce((acc, char, index) => {
        const val = baseMap.indexOf(char);
        if (val !== -1) return acc + val * Math.pow(baseLen, index);
        return acc;
      }, 0);
    };
    while (i < len) {
      let s = "";
      while (h[i] !== separator && i < len) {
        s += h[i];
        i++;
      }
      for (let j = 0; j < n.length; j++) {
        s = s.split(n[j]).join(j.toString());
      }
      const charCode = convertBase(s, n.slice(0, e)) - t;
      result += String.fromCharCode(charCode);
      i++;
    }
    return decodeURIComponent(result);
  }
  extractHtml(jsCode) {
    const match = jsCode.match(/innerHTML\s*=\s*"(.*?)";/);
    if (match && match[1]) {
      return match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "").replace(/\\r/g, "");
    }
    return jsCode;
  }
  parse(html) {
    if (!html) return {
      result: [],
      status: false
    };
    const $ = cheerio.load(html);
    const results = [];
    $(".download-box li, .download-items").each((i, el) => {
      const $el = $(el);
      const $thumbEl = $el.find(".download-items__thumb img");
      const $btnEl = $el.find(".download-items__btn a");
      const url = $btnEl.attr("href");
      if (!url) return;
      const thumbnail = $thumbEl.attr("src");
      const btnText = $btnEl.text().toLowerCase();
      const btnTitle = ($btnEl.attr("title") || "").toLowerCase();
      const urlLower = url.toLowerCase();
      let type = "image";
      if (btnText.includes("video") || btnTitle.includes("video") || urlLower.includes(".mp4")) {
        type = "video";
      }
      results.push({
        type: type,
        url: url,
        thumbnail: thumbnail || ""
      });
    });
    if (results.length === 0) {
      $('a[href^="https://dl.snapcdn"], a[href*="snapinsta.to"]').each((i, el) => {
        const link = $(el).attr("href");
        if (link && link !== "/") {
          results.push({
            type: link.includes("mp4") ? "video" : "image",
            url: link,
            thumbnail: ""
          });
        }
      });
    }
    const username = $(".user-info .user-name, .media-info h3").first().text().trim() || null;
    const avatar = $(".user-info img, .media-info img").first().attr("src") || null;
    const caption = $(".media-info .caption, .content-text").first().text().trim() || null;
    return {
      status: true,
      result: results,
      author: username ? {
        username: username,
        avatar: avatar
      } : null,
      caption: caption
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
  const api = new SnapInsta();
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