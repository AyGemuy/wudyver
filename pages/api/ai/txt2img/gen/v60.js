import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import qs from "qs";
import apiConfig from "@/configs/apiConfig";
const randStr = (len = 8) => Math.random().toString(36).substring(2, 2 + len);
const VALID_STYLES = ["default", "anime", "anthro", "photographic", "fantasy", "vaporwave", "lowpoly", "origami", "line_art", "craft_clay", "cinematic", "3d_model", "pixel_art"];
class DeviantDream {
  constructor() {
    this.base = "https://www.deviantart.com";
    this.username = `User${randStr(6)}`;
    this.password = `Pass${randStr(8)}!`;
    this.email = "";
    this.csrf = "";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.base,
      jar: this.jar,
      withCredentials: true,
      timeout: 6e4,
      headers: {
        authority: "www.deviantart.com",
        accept: "application/json, text/plain, */*",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        origin: this.base,
        referer: this.base
      }
    }));
    this.mailReq = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      timeout: 6e4,
      headers: {
        "User-Agent": "NodeJS-Axios/1.0"
      }
    });
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  async req(url, method = "GET", data = null, customHeaders = {}) {
    try {
      return await this.client({
        method: method,
        url: url,
        data: data,
        headers: {
          ...this.client.defaults.headers,
          ...customHeaders
        }
      });
    } catch (e) {
      if (e.response) {
        const errMsg = JSON.stringify(e.response.data).slice(0, 100);
        this.log(`Req Fail [${e.response.status}]: ${errMsg}`, "ERR");
      } else {
        this.log(`Req Error: ${e.message}`, "ERR");
      }
      return null;
    }
  }
  async init(targetUrl = "/") {
    this.log(`Get CSRF from ${targetUrl}...`, "INIT");
    const resp = await this.req(targetUrl);
    const html = resp?.data || "";
    const match = html.match(/window\.__CSRF_TOKEN__\s*=\s*['"]([^'"]+)['"]/);
    this.csrf = match?.[1] || "";
    if (!this.csrf) {
      this.log("Token not found", "ERR");
      return false;
    }
    this.log(`Token: ${this.csrf.slice(0, 10)}...`, "OK");
    return true;
  }
  async createMail() {
    this.log("Make Mail...", "MAIL");
    try {
      const resp = await this.mailReq.get("", {
        params: {
          action: "create"
        }
      });
      this.email = resp.data?.email || null;
      if (!this.email) throw new Error("API Mail Failed");
      this.log(`Email: ${this.email}`, "OK");
      return true;
    } catch (e) {
      return false;
    }
  }
  async signup() {
    this.log(`Signup: ${this.username}`, "AUTH");
    const payload = qs.stringify({
      referer: `${this.base}/dreamup`,
      csrf_token: this.csrf,
      da_dreamup: "1",
      join_mode: "email",
      email: this.email,
      password: this.password,
      username: this.username,
      dobMonth: "01",
      dobDay: "01",
      dobYear: "2000",
      tos: "1"
    });
    const resp = await this.req("/_sisu/do/signup2", "POST", payload, {
      "content-type": "application/x-www-form-urlencoded"
    });
    return resp?.data?.success || resp?.status === 200;
  }
  async checkLink() {
    this.log("Polling inbox...", "WAIT");
    let link = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3e3));
      try {
        const resp = await this.mailReq.get("", {
          params: {
            action: "message",
            email: this.email
          }
        });
        const msgs = resp.data?.data || [];
        if (msgs.length > 0) {
          const $ = cheerio.load(msgs[0].html_content || msgs[0].body || "");
          link = $("a.cta-button").attr("href");
          if (link) {
            this.log("Link found!", "OK");
            break;
          }
        }
      } catch (e) {}
      process.stdout.write(".");
    }
    console.log("");
    return link;
  }
  async verify(link) {
    this.log("Verifying link...", "AUTH");
    await this.req(link);
    const cookies = this.jar.getCookiesSync(this.base);
    if (cookies.some(c => c.key === "auth" || c.key === "userinfo")) {
      this.log("Verified! Refreshing Token...", "SUCCESS");
      await this.init("/dreamup");
      return true;
    }
    return false;
  }
  async generate({
    prompt,
    style = "default",
    ...rest
  }) {
    if (!VALID_STYLES.includes(style)) style = "default";
    this.log(`Gen: "${prompt}" [Style: ${style}]`, "AI");
    const payload = {
      prompt: prompt,
      use_points: false,
      aspect_ratio: "3:4",
      guidance_scale: 7.5,
      style: style,
      da_minor_version: 20230710,
      csrf_token: this.csrf,
      ...rest
    };
    const headers = {
      "content-type": "application/json",
      referer: `${this.base}/dreamup`,
      "x-csrf-token": this.csrf,
      "x-requested-with": "XMLHttpRequest"
    };
    const resp = await this.req("/_puppy/dreamsofart/generate", "POST", payload, headers);
    const id = resp?.data?.generationId;
    if (id) {
      this.log(`Job ID: ${id}. Waiting result...`, "OK");
      await new Promise(r => setTimeout(r, 3e3));
      return id;
    }
    return null;
  }
  async result(maxAttempts = 20) {
    this.log("Polling results (Sync)...", "SCRAPE");
    let attempts = 0;
    let images = [];
    while (attempts < maxAttempts) {
      attempts++;
      const resp = await this.req("/dreamup");
      const html = resp?.data || "";
      const $ = cheerio.load(html);
      const currentImages = [];
      $('div[data-testid="grid-row"] img').each((_, el) => {
        const src = $(el).attr("src");
        const srcset = $(el).attr("srcset");
        if (src && src.includes("wixmp")) {
          let bestUrl = src;
          if (srcset) {
            const candidates = srcset.split(/,\s+/);
            const lastCandidate = candidates[candidates.length - 1].trim();
            const urlParts = lastCandidate.split(/\s+/);
            if (urlParts.length > 0) {
              bestUrl = urlParts[0];
            }
          }
          currentImages.push(bestUrl);
        }
      });
      if (currentImages.length > 0) {
        images = currentImages;
        console.log("");
        this.log(`Found ${images.length} images!`, "SUCCESS");
        break;
      }
      process.stdout.write(".");
      await new Promise(r => setTimeout(r, 3e3));
    }
    if (images.length === 0) {
      console.log("");
      this.log("Timeout: Images not rendered.", "WARN");
    }
    return images;
  }
  async run(params = {}) {
    try {
      if (!await this.init("/")) return;
      if (!await this.createMail()) return;
      if (!await this.signup()) return;
      const link = await this.checkLink();
      if (link) {
        if (await this.verify(link)) {
          const genId = await this.generate(params);
          if (genId) {
            const res = await this.result();
            console.log("\n=== RESULT ===");
            console.log(JSON.stringify(res, null, 2));
            return {
              result: res
            };
          }
        }
      } else {
        this.log("Timeout waiting email", "ERR");
      }
    } catch (e) {
      this.log(e.message, "FATAL");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new DeviantDream();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}