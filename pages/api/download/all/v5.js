import axios from "axios";
import CryptoJS from "crypto-js";
class Tiqu {
  constructor() {
    this.api = {
      base: "https://wapi.tiqu.cc/api/all/"
    };
    this.regex = {
      tiktok: /^https?:\/\/(www\.|m\.|vt\.)?tiktok\.com/,
      douyin: /^https?:\/\/(v\.|www\.)?douyin\.com/,
      instagram: /^https?:\/\/(www\.)?instagram\.com/,
      twitter: /^https?:\/\/(www\.)?(twitter\.com|x\.com)/,
      xiaohongshu: /^https?:\/\/(www\.xiaohongshu\.com|xhslink\.com)/
    };
    this.headers = {
      accept: "*/*",
      "user-agent": "Postify/1.0.0",
      referer: "https://tiqu.cc/"
    };
    this.secretKey = "bfa95f704ce74c5cba31820ea1c0da05";
  }
  _sign(url, t) {
    return CryptoJS.HmacSHA256(`t=${t}&url=${url}`, this.secretKey).toString(CryptoJS.enc.Hex);
  }
  _encode(hex) {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(hex));
  }
  _checkUrl(url) {
    if (!url?.trim()) return {
      status: false,
      error: "URL is required."
    };
    try {
      new URL(url);
    } catch {
      return {
        status: false,
        error: "Invalid URL."
      };
    }
    if (!Object.values(this.regex).some(regex => regex.test(url))) {
      return {
        status: false,
        error: "URL not supported. Use TikTok, Douyin, Instagram, Twitter, or Xiaohongshu."
      };
    }
    return {
      status: true
    };
  }
  async download(url) {
    const {
      status,
      error
    } = this._checkUrl(url);
    if (!status) return {
      status: false,
      error: error
    };
    const t = Date.now().toString();
    const sign = this._encode(this._sign(url, t));
    try {
      const {
        data
      } = await axios.get(`${this.api.base}?url=${encodeURIComponent(url)}&t=${t}&sign=${encodeURIComponent(sign)}`, {
        headers: {
          ...this.headers,
          t: t,
          sign: sign
        }
      });
      return data ? {
        status: true,
        data: data
      } : {
        status: false,
        error: "No data received."
      };
    } catch {
      return {
        status: false,
        error: "Error during download."
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      status: false,
      error: "URL parameter is required."
    });
  }
  const tiquInstance = new Tiqu();
  const result = await tiquInstance.download(url);
  if (result.status) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}