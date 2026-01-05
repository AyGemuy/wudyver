import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import CryptoJS from "crypto-js";
import FormData from "form-data";
class Inflact {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
    this.cid = this.rnd(32);
    this.secret = this.genKey();
  }
  rnd(len) {
    return CryptoJS.lib.WordArray.random(len / 2).toString(CryptoJS.enc.Hex);
  }
  genKey() {
    const d = {
      r: [57, 100, 48, 54, 51, 60, 48, 102],
      d: [98, 53, 59, 55, 51, 100, 103, 100],
      a: [51, 50, 48, 101, 102, 53, 48, 63],
      u: [49, 103, 52, 50, 49, 100, 51, 100],
      m: [99, 48, 96, 98, 98, 96, 101, 62],
      h: [53, 49, 53, 54, 97, 50, 99, 62],
      p: [55, 57, 97, 55, 50, 61, 101, 62],
      v: [100, 101, 97, 55, 103, 51, 54, 97]
    };
    const s = t => t.split("").map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ i % t.length)).join("");
    const c = a => a.map(x => String.fromCharCode(x)).join("");
    return ["r", "d", "a", "u", "m", "h", "p", "v"].map(k => s(c(d[k]))).join("");
  }
  head() {
    const ts = Math.floor(Date.now() / 1e3);
    const nonce = this.rnd(32);
    const payload = JSON.stringify({
      timestamp: ts,
      clientId: this.cid,
      nonce: nonce
    });
    const encoded = Buffer.from(payload).toString("base64");
    const sign = CryptoJS.HmacSHA256(payload, this.secret).toString(CryptoJS.enc.Hex);
    return {
      authority: "inflact.com",
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://inflact.com",
      referer: "https://inflact.com/instagram-downloader/",
      "user-agent": this.ua,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-client-token": encoded,
      "x-client-signature": sign,
      baggage: `sentry-environment=production,sentry-public_key=1b282a50293c4c9738e871bb3fadd05c,sentry-trace_id=${this.rnd(32)},sentry-sampled=false`,
      "sentry-trace": `${this.rnd(32)}-${this.rnd(16)}-0`
    };
  }
  async req(path, form) {
    console.log(`[LOG] POST ${path}`);
    try {
      const {
        data
      } = await this.api.post(`https://inflact.com/downloader/api/downloader/${path}`, form, {
        headers: {
          ...this.head(),
          ...form.getHeaders()
        }
      });
      return data?.status === "success" ? data.data : {};
    } catch (e) {
      console.error(`[ERR] ${path}: ${e.response?.status || e.message}`);
      return {};
    }
  }
  async download({
    url
  }) {
    if (!url) return {
      error: "URL kosong"
    };
    console.log(`[START] Processing: ${url}`);
    try {
      const f1 = new FormData();
      f1.append("username", url);
      const res1 = await this.req("search/", f1);
      const f2 = new FormData();
      f2.append("url", url);
      const res2 = await this.req("profile/?lang=en", f2);
      const f3 = new FormData();
      f3.append("url", url);
      const res3 = await this.req("post/", f3);
      return {
        target_url: url,
        timestamp: new Date().toISOString(),
        ...res1 || {},
        ...res2 || {},
        ...res3 || {}
      };
    } catch (e) {
      console.error("[FAIL] Global Error:", e.message);
      return {
        error: e.message
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
  const api = new Inflact();
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