import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class LinkBypasser {
  constructor() {
    this.cookies = [];
    this.refererLocation = "";
    this.rayId = "";
    this.alias = "";
    this.bypassResult = null;
    this.verification = null;
  }
  async bypass({
    url
  }) {
    console.log(`[PROCESS] Starting bypass for URL: ${url}`);
    try {
      console.log("[PROCESS] Step 1: Getting initial page...");
      await this.step1_getInitialPage(url);
      console.log("[PROCESS] Step 1 completed.");
      console.log("[PROCESS] Step 2: Redirecting with parameters...");
      await this.step2_redirectWithParams();
      console.log("[PROCESS] Step 2 completed.");
      console.log("[PROCESS] Step 3: Bypassing Turnstile...");
      await this.step3_bypassTurnstile();
      console.log("[PROCESS] Step 3 completed.");
      console.log("[PROCESS] Step 4: Verifying bypass...");
      await this.step4_verify();
      console.log("[PROCESS] Step 4 completed.");
      console.log("[PROCESS] Step 5: Going to final destination...");
      const finalResult = await this.step5_go();
      console.log("[PROCESS] Step 5 completed.");
      console.log("[PROCESS] Bypass process completed successfully.");
      return finalResult;
    } catch (error) {
      console.error(`[ERROR] Bypass failed: ${error.message}`);
      return null;
    }
  }
  async step1_getInitialPage(shortlink) {
    try {
      const res = await axios.get(shortlink, {
        headers: this.defaultHeaders("sfl.gl")
      });
      this.appendCookies(res.headers["set-cookie"]);
      const $ = cheerio.load(res.data);
      this.rayId = $('input[name="ray_id"]').val();
      this.alias = $('input[name="alias"]').val();
      console.log(`[DEBUG] Step 1: rayId=${this.rayId}, alias=${this.alias}`);
    } catch (error) {
      console.error(`[ERROR] Step 1 (getInitialPage) failed: ${error.message}`);
      throw error;
    }
  }
  async step2_redirectWithParams() {
    try {
      const res = await axios.get("https://tutwuri.id/redirect.php", {
        params: {
          ray_id: this.rayId,
          alias: this.alias
        },
        headers: {
          ...this.defaultHeaders("tutwuri.id"),
          cookie: this.getCookieHeader(),
          referer: "https://sfl.gl/"
        },
        maxRedirects: 0,
        validateStatus: null
      });
      this.appendCookies(res.headers["set-cookie"]);
      this.refererLocation = res.headers["location"];
      console.log(`[DEBUG] Step 2: refererLocation=${this.refererLocation}`);
    } catch (error) {
      console.error(`[ERROR] Step 2 (redirectWithParams) failed: ${error.message}`);
      throw error;
    }
  }
  async step3_bypassTurnstile() {
    try {
      const sitekey = "0x4AAAAAAAfjzEk6sEUVcFw1";
      const targetUrl = "https://tutwuri.id/";
      const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`, {
        params: {
          siteKey: sitekey,
          url: targetUrl
        },
        headers: {
          accept: "application/json"
        }
      });
      if (!res.data?.status) {
        throw new Error(res.data.message || "Turnstile bypass API returned an error.");
      }
      this.bypassResult = res.data.data;
      console.log(`[DEBUG] Step 3: Turnstile token obtained.`);
    } catch (error) {
      console.error(`[ERROR] Step 3 (bypassTurnstile) failed: ${error.message}`);
      throw error;
    }
  }
  async step4_verify() {
    try {
      if (!this.bypassResult || !this.bypassResult.token) {
        throw new Error("No Turnstile token available for verification.");
      }
      const res = await axios.post("https://tutwuri.id/api/v1/verify", {
        _a: 0,
        "cf-turnstile-response": this.bypassResult.token
      }, {
        headers: {
          ...this.apiHeaders(),
          origin: "https://tutwuri.id",
          referer: `https://tutwuri.id/${this.refererLocation}`
        }
      });
      this.verification = res.data;
      console.log(`[DEBUG] Step 4: Verification status=${this.verification.status}`);
    } catch (error) {
      console.error(`[ERROR] Step 4 (verify) failed: ${error.message}`);
      throw error;
    }
  }
  async step5_go() {
    try {
      const res = await axios.post("https://tutwuri.id/api/v1/go", {
        key: Math.floor(Math.random() * 1e3),
        size: "2278.3408",
        _dvc: btoa(Math.floor(Math.random() * 1e3).toString())
      }, {
        headers: {
          ...this.apiHeaders(),
          origin: "https://tutwuri.id",
          referer: `https://tutwuri.id/${this.refererLocation}`
        }
      });
      return {
        ...res.data,
        linkGo: this.decodeUParam(res.data?.url)
      };
    } catch (error) {
      console.error(`[ERROR] Step 5 (go) failed: ${error.message}`);
      throw error;
    }
  }
  defaultHeaders(host) {
    return {
      authority: host,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  apiHeaders() {
    return {
      authority: "tutwuri.id",
      accept: "application/json, text/plain, */*",
      "accept-language": "ms-MY,ms;q=0.9,en-US;q=0.8,en;q=0.7",
      cookie: this.getCookieHeader(),
      "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/50 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };
  }
  appendCookies(cookieArr) {
    if (!Array.isArray(cookieArr)) return;
    const parsed = cookieArr.map(c => c.split(";")[0]);
    this.cookies.push(...parsed);
    console.log(`[DEBUG] Cookies appended. Current cookies count: ${this.cookies.length}`);
  }
  getCookieHeader() {
    return decodeURIComponent(this.cookies.join("; "));
  }
  decodeUParam(fullUrl) {
    if (!fullUrl) {
      console.warn("[WARNING] decodeUParam received null or undefined URL.");
      return null;
    }
    try {
      const urlObj = new URL(fullUrl);
      const encodedU = urlObj.searchParams.get("u");
      if (!encodedU) {
        throw new Error('Parameter "u" not found in URL.');
      }
      return atob(decodeURIComponent(encodedU));
    } catch (error) {
      console.error(`[ERROR] decodeUParam failed for URL "${fullUrl}": ${error.message}`);
      throw error;
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
    const bypasser = new LinkBypasser();
    const response = await bypasser.bypass(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}