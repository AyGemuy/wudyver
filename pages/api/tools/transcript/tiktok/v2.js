import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import SpoofHead from "@/lib/spoof-head";
class TiktokTrans {
  constructor() {
    this.baseUrl = "https://transcriptik.com/wp-admin/admin-ajax.php";
    this.siteUrl = "https://transcriptik.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://transcriptik.com",
      pragma: "no-cache",
      referer: "https://transcriptik.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.cookieJar = new CookieJar();
    this.nonce = "";
  }
  async fetchNonce() {
    try {
      this.log("Fetching real nonce...");
      const res = await axios.get(this.siteUrl, {
        headers: this.headers,
        jar: this.cookieJar
      });
      const $ = cheerio.load(res.data);
      const script = $("#ttt-js-js-extra").html() || "";
      const match = script.match(/"nonce":"([a-z0-9]+)"/);
      this.nonce = match?.[1] || "";
      this.log(`✓ Real nonce: ${this.nonce}`);
      return this.nonce;
    } catch (err) {
      this.log(`Nonce fetch failed: ${err.message}`);
      this.nonce = Math.random().toString(36).substring(2, 10);
      this.log(`Fallback random: ${this.nonce}`);
      return this.nonce;
    }
  }
  log(msg) {
    console.log(`[TiktokTrans] ${msg}`);
  }
  async chk(url) {
    return await this.send("ttt_check", {
      video_url: url
    });
  }
  async init(id) {
    return await this.send("ttt_transcribe_init", {
      video_url: id
    });
  }
  async poll(id) {
    return await this.send("ttt_transcribe_poll", {
      id: id
    });
  }
  async send(action, data = {}) {
    if (!this.nonce) await this.fetchNonce();
    const form = new FormData();
    form.append("action", action);
    form.append("nonce", this.nonce);
    Object.entries(data).forEach(([k, v]) => form.append(k, v));
    this.headers["content-type"] = form.getHeaders()["content-type"];
    try {
      const res = await axios.post(this.baseUrl, form, {
        headers: this.headers,
        jar: this.cookieJar
      });
      return {
        success: true,
        data: res?.data
      };
    } catch (err) {
      return {
        success: false,
        err: err?.message || "Unknown"
      };
    }
  }
  async generate({
    url,
    timeout = 3e4,
    pollMs = 2e3
  } = {}) {
    try {
      const videoUrl = url || "";
      if (!videoUrl) throw new Error("URL required");
      this.log(`Start: ${videoUrl}`);
      this.log("Step 1: Check");
      const chkRes = await this.chk(videoUrl);
      if (!chkRes?.success || !chkRes?.data?.success) throw new Error("Check failed");
      this.log("✓ Check OK");
      this.log("Step 2: Init");
      const initRes = await this.init(videoUrl);
      if (!initRes?.success || !initRes?.data?.success) throw new Error("Init failed");
      const transcribeId = initRes?.data?.id || "";
      this.log(`✓ Init ID: ${transcribeId}`);
      this.log("Step 3: Poll");
      let statusRes, attempts = 0,
        maxAttempts = Math.ceil(timeout / pollMs);
      do {
        await new Promise(r => setTimeout(r, pollMs));
        statusRes = await this.poll(transcribeId);
        attempts++;
        this.log(`Poll ${attempts}/${maxAttempts}: ${statusRes?.data?.status || "unknown"}`);
      } while (statusRes?.data?.status === "processing" && attempts < maxAttempts);
      if (!statusRes?.success || statusRes?.data?.status !== "completed") throw new Error(`Poll failed: ${statusRes?.data?.status || "timeout"}`);
      this.log("✓ Completed");
      return {
        success: true,
        text: statusRes?.data?.text || "",
        meta: statusRes?.data?.meta || {},
        quota: statusRes?.data?.quota || {}
      };
    } catch (err) {
      this.log(`Error: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const api = new TiktokTrans();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}