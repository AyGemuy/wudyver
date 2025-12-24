import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class TutwuriClient {
  constructor() {
    this.cookies = [];
    this.refLoc = "";
    this.bpUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`;
    this.sKey = "0x4AAAAAAAfjzEk6sEUVcFw1";
    this.base = "https://tutwuri.id";
  }
  log(msg, type = "info") {
    const t = new Date().toLocaleTimeString();
    if (type === "error") console.error(`[${t}] [ERR] ${msg}`);
    else console.log(`[${t}] [LOG] ${msg}`);
  }
  atob(s) {
    return Buffer.from(s, "base64").toString("binary");
  }
  btoa(s) {
    return Buffer.from(s, "binary").toString("base64");
  }
  async run({
    url
  }) {
    try {
      this.log(`Memulai proses untuk: ${url}`);
      this.origin = new URL(url).origin + "/";
      await this.page(url);
      await this.redir();
      await this.bypass(this.origin, this.sKey);
      await this.verify();
      const result = await this.go();
      this.log("Sukses mendapatkan link tujuan.");
      return result;
    } catch (e) {
      this.log(e.message, "error");
      return null;
    }
  }
  async page(url) {
    try {
      this.log("Mengambil halaman awal...");
      const res = await axios.get(url, {
        headers: this.head(new URL(url).host)
      });
      this.setCookies(res.headers["set-cookie"]);
      const $ = cheerio.load(res.data);
      this.rayId = $('input[name="ray_id"]').val();
      this.alias = $('input[name="alias"]').val();
      if (!this.rayId || !this.alias) throw new Error("Gagal mengambil ray_id/alias.");
    } catch (e) {
      throw new Error(`Step Page: ${e.message}`);
    }
  }
  async redir() {
    try {
      this.log("Melakukan redirect parameter...");
      const res = await axios.get(`${this.base}/redirect.php`, {
        params: {
          ray_id: this.rayId,
          alias: this.alias
        },
        headers: {
          ...this.head("tutwuri.id"),
          cookie: this.getCookies(),
          referer: this.origin
        },
        maxRedirects: 0,
        validateStatus: null
      });
      this.setCookies(res.headers["set-cookie"]);
      this.refLoc = res.headers["location"];
      if (!this.refLoc) throw new Error("Lokasi redirect tidak ditemukan.");
    } catch (e) {
      throw new Error(`Step Redir: ${e.message}`);
    }
  }
  async bypass(url, key) {
    try {
      this.log("Bypassing Turnstile...");
      const res = await axios.get(this.bpUrl, {
        params: {
          url: url,
          sitekey: key
        },
        headers: {
          accept: "application/json"
        }
      });
      if (res.data?.status !== "ok" || !res.data?.token) {
        throw new Error(res.data?.message || "Gagal bypass captcha.");
      }
      this.token = res.data.token;
    } catch (e) {
      throw new Error(`Step Bypass: ${e.message}`);
    }
  }
  async verify() {
    try {
      this.log("Verifikasi token...");
      await axios.post(`${this.base}/api/v1/verify`, {
        _a: 0,
        "cf-turnstile-response": this.token
      }, {
        headers: this.headApi()
      });
    } catch (e) {
      throw new Error(`Step Verify: ${e.message}`);
    }
  }
  async go() {
    try {
      this.log("Request link akhir (GO)...");
      const res = await axios.post(`${this.base}/api/v1/go`, {
        key: Math.floor(Math.random() * 1e3),
        size: "2278.3408",
        _dvc: this.btoa(String(Math.floor(Math.random() * 1e3)))
      }, {
        headers: this.headApi()
      });
      const decoded = this.dec(res.data);
      if (!decoded) throw new Error("Gagal decode link dari response.");
      return {
        ...res.data,
        linkGo: decoded
      };
    } catch (e) {
      throw new Error(`Step Go: ${e.message}`);
    }
  }
  dec(data) {
    try {
      if (data?.url) {
        const uVal = new URL(data.url).searchParams.get("u");
        if (uVal) return this.atob(decodeURIComponent(uVal));
      }
      const keys = ["url", "redirect", "link", "target", "go", "data"];
      for (const k of keys) {
        if (data[k] && this.isUrl(data[k])) return data[k];
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  isUrl(s) {
    try {
      return ["http:", "https:"].includes(new URL(s).protocol);
    } catch {
      return false;
    }
  }
  setCookies(arr) {
    if (!Array.isArray(arr)) return;
    this.cookies.push(...arr.map(c => c.split(";")[0]));
  }
  getCookies() {
    return decodeURIComponent(this.cookies.join("; "));
  }
  head(host) {
    return {
      authority: host,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua-mobile": "?1"
    };
  }
  headApi() {
    return {
      ...this.head("tutwuri.id"),
      accept: "application/json, text/plain, */*",
      cookie: this.getCookies(),
      origin: this.base,
      referer: `${this.base}/${this.refLoc}`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
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
  const api = new TutwuriClient();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}