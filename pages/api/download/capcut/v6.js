import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class PostSyncer {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.base = "https://postsyncer.com";
    this.csrfToken = null;
    this.xsrfToken = null;
    this.log("Init", "Ready");
  }
  log(tag, msg) {
    console.log(`[${new Date().toLocaleTimeString()}] [${tag}] ${msg || "-"}`);
  }
  h(ex = {}) {
    return {
      authority: "postsyncer.com",
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: this.base,
      referer: `${this.base}/tools/capcut-video-downloader`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-csrf-token": this.csrfToken ? this.csrfToken : "",
      ...ex
    };
  }
  async req(method, path, data = null, headers = {}) {
    const url = path.startsWith("http") ? path : `${this.base}${path}`;
    try {
      this.log("Req", `${method.toUpperCase()} ${path}`);
      const cfg = {
        method: method,
        url: url,
        headers: this.h(headers),
        data: ["post", "put", "patch"].includes(method) ? data || {} : undefined,
        params: method === "get" ? data || {} : undefined
      };
      const res = await this.client(cfg);
      return res;
    } catch (e) {
      const errBody = e?.response?.data;
      this.log("Err", errBody?.message || e.message);
      throw e;
    }
  }
  async sync() {
    if (this.csrfToken) return;
    this.log("Sync", "Fetching Page for Tokens...");
    const res = await this.req("get", "/tools/capcut-video-downloader");
    const $ = cheerio.load(res?.data || "");
    const meta = $('meta[name="csrf-token"]').attr("content");
    this.csrfToken = meta || null;
    const cookies = await this.jar.getCookies(this.base);
    const xsrf = cookies.find(c => c.key === "XSRF-TOKEN");
    this.xsrfToken = xsrf ? xsrf.value : null;
    this.log("Info", `Meta-CSRF: ${this.csrfToken ? "OK" : "MISSING"}`);
    this.log("Info", `Cookie-XSRF: ${this.xsrfToken ? "OK" : "MISSING"}`);
  }
  async download({
    url,
    ...rest
  }) {
    const link = url || "";
    if (!link) {
      this.log("Warn", "URL Empty");
      return {
        status: false,
        msg: "URL Required"
      };
    }
    try {
      await this.sync();
      const payload = {
        url: link,
        platform: rest?.platform || "capcut",
        ...rest
      };
      this.log("Start", `Processing: ${link}`);
      const resp = await this.req("post", "/api/social-media-downloader", payload);
      const isOk = resp?.data?.data ? true : false;
      this.log("Done", isOk ? "Success" : "Failed/Verify needed");
      return resp?.data || {};
    } catch (error) {
      return {
        status: false,
        message: error?.response?.statusText || error?.message
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
  const api = new PostSyncer();
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