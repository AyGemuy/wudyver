import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Genviral {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 1e4
    }));
    this.baseURL = "https://www.genviral.io";
    this.log("Init", "Client ready");
  }
  log(tag, msg) {
    console.log(`[${new Date().toLocaleTimeString()}] [${tag}] ${msg || "-"}`);
  }
  h(ex = {}) {
    return {
      authority: "www.genviral.io",
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: this.baseURL,
      referer: `${this.baseURL}/tools/download/capcut`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      ...ex ? ex : {}
    };
  }
  async req(method, path, data = null, headers = {}) {
    const url = `${this.baseURL}${path}`;
    try {
      this.log("Req", `${method.toUpperCase()} ${path}`);
      const cfg = {
        method: method,
        url: url,
        headers: this.h(headers),
        data: method === "post" ? data || {} : undefined,
        params: method === "get" ? data || {} : undefined
      };
      const res = await this.client(cfg);
      return res?.data;
    } catch (e) {
      const errMsg = e?.response?.data?.message || e.message;
      this.log("Err", errMsg);
      throw e;
    }
  }
  async download({
    url,
    ...rest
  }) {
    const targetUrl = url || "";
    if (!targetUrl) {
      this.log("Warn", "URL is missing");
      return {
        error: true,
        msg: "URL Required"
      };
    }
    this.log("Start", `Processing: ${targetUrl}`);
    try {
      const payload = {
        url: targetUrl,
        ...rest
      };
      const extraHeaders = {
        baggage: "sentry-environment=production,sentry-release=61fd948688f6306cf6bd72a4a34af0651edac5c0,sentry-public_key=360a5271964ef3bc33b47f8760ecec7d,sentry-trace_id=3b738d09ce93276d5d2e7d51c2cee4a2,sentry-org_id=4509345024901120,sentry-transaction=GET%20%2Ftools%2Fdownload%2F%5Bplatform%5D,sentry-sampled=true,sentry-sample_rand=0.9099824983064397,sentry-sample_rate=1",
        "sentry-trace": "3b738d09ce93276d5d2e7d51c2cee4a2-817d4e4cf4c75abe-1",
        priority: "u=1, i"
      };
      const resp = await this.req("post", "/api/tools/social-downloader", payload, extraHeaders);
      const isSuccess = resp?.data ? true : false;
      this.log("Done", isSuccess ? "Success" : "Failed");
      return resp || {};
    } catch (error) {
      return {
        success: false,
        message: error?.message || "Unknown error"
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
  const api = new Genviral();
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