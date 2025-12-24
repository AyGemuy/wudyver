import axios from "axios";
import CryptoJS from "crypto-js";
class TeraboxDownloader {
  constructor() {
    this.BASE_URL = "https://ronnieverse.site";
    this.SECRET_KEY = "8bX3rT!kV9pZq2^fL7sGm@wY4dJcH6zN0aB$eR1tUoQ8yFvKjL5xW#iP2nDgM4h";
    this.ENDPOINT = "/v2/api";
    this.TIMEOUT = 3e4;
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://tera-downloader.com",
      referer: "https://tera-downloader.com/",
      "sec-ch-ua": `"Chromium";v="127", "Not)A;Brand";v="99"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  encryptData(payload) {
    const json = JSON.stringify(payload);
    const salt = CryptoJS.lib.WordArray.random(8);
    const derived = CryptoJS.PBKDF2(this.SECRET_KEY, salt, {
      keySize: 12,
      iterations: 1,
      hasher: CryptoJS.algo.SHA1
    });
    const key = CryptoJS.lib.WordArray.create(derived.words.slice(0, 8));
    const iv = CryptoJS.lib.WordArray.create(derived.words.slice(8, 12));
    const encrypted = CryptoJS.AES.encrypt(json, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const salted = CryptoJS.enc.Utf8.parse("Salted__").concat(salt).concat(encrypted.ciphertext);
    return encodeURIComponent(CryptoJS.enc.Base64.stringify(salted));
  }
  async download({
    url
  }) {
    try {
      console.log("Encrypting payload...");
      const ts = Math.floor(Date.now() / 1e3);
      const encrypted = this.encryptData({
        url: url,
        ts: ts
      });
      console.log("Sending request...");
      const response = await axios.post(`${this.BASE_URL}${this.ENDPOINT}`, {
        data: encrypted
      }, {
        timeout: this.TIMEOUT,
        headers: this.headers
      });
      console.log("Response received");
      if (response.data.list && Array.isArray(response.data.list)) {
        response.data.list.forEach(item => {
          if (item.direct_link) {
            item.url_fixer = "https://terabox-url-fixer.mohdamir7505.workers.dev?url=" + item.direct_link;
            if (item.stream_url) {
              const e = encodeURIComponent(item.stream_url);
              const t = encodeURIComponent(item.direct_link);
              item.player_url = `https://player.teraboxdl.site?start=${e}&direct_link=${t}`;
            }
          }
        });
        console.log("URLs formatted");
      }
      return response.data;
    } catch (err) {
      console.error("Error:", err.message);
      throw err;
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
  const api = new TeraboxDownloader();
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