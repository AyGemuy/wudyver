import {
  Session,
  ClientIdentifier,
  initTLS,
  destroyTLS
} from "node-tls-client";
class TurnstileSolver {
  constructor(options = {}) {
    this.timeout = options.timeout || 6e4;
    this.clientIdentifier = options.clientIdentifier || ClientIdentifier.chrome_120;
    this.userAgent = options.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    this.session = null;
    this.isInitialized = false;
  }
  async init() {
    if (this.isInitialized) return;
    await initTLS();
    this.session = new Session({
      clientIdentifier: this.clientIdentifier,
      timeout: this.timeout,
      insecureSkipVerify: false,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "user-agent": this.userAgent,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1"
      }
    });
    this.isInitialized = true;
  }
  async extractTurnstileParams(url) {
    try {
      console.log(`Scraping parameters from ${url}...`);
      const response = await this.session.get(url);
      const html = response.body;
      const sitekeyMatch = html.match(/data-sitekey="([^"]+)"/);
      const cDataMatch = html.match(/data-cdata="([^"]+)"/);
      const actionMatch = html.match(/data-action="([^"]+)"/);
      const chlMatch = html.match(/chlPageData\s*[:=]\s*['"]([^'"]+)['"]/);
      return {
        sitekey: sitekeyMatch ? sitekeyMatch[1] : null,
        cData: cDataMatch ? cDataMatch[1] : "",
        action: actionMatch ? actionMatch[1] : "",
        chlPageData: chlMatch ? chlMatch[1] : ""
      };
    } catch (error) {
      console.error("Gagal scraping params:", error.message);
      return {
        cData: "",
        action: "",
        chlPageData: ""
      };
    }
  }
  safeParse(response) {
    const body = response.body || "";
    try {
      return JSON.parse(body);
    } catch (e) {
      console.log("Response Cloudflare (Raw):", body);
      return null;
    }
  }
  async solve({
    url,
    sitekey
  }) {
    if (!this.isInitialized) {
      await this.init();
    }
    const targetUrl = url || "https://challenges.cloudflare.com";
    const scrapedParams = await this.extractTurnstileParams(targetUrl);
    const finalSitekey = sitekey || scrapedParams.sitekey;
    if (!finalSitekey) {
      throw new Error("Sitekey tidak ditemukan di parameter maupun di halaman target.");
    }
    try {
      console.log("Loading Turnstile API...");
      const turnstileApiUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      await this.session.get(turnstileApiUrl, {
        headers: {
          referer: targetUrl
        }
      });
      console.log("Requesting Turnstile challenge...");
      console.log(`Menggunakan params -> Sitekey: ${finalSitekey}, Action: ${scrapedParams.action}, cData: ${scrapedParams.cData}`);
      const challengeResponse = await this.session.post("https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/challenge", {
        headers: {
          "content-type": "application/json",
          origin: new URL(targetUrl).origin,
          referer: targetUrl
        },
        body: JSON.stringify({
          sitekey: finalSitekey,
          url: targetUrl,
          action: scrapedParams.action,
          cData: scrapedParams.cData,
          chlPageData: scrapedParams.chlPageData
        })
      });
      const challengeData = this.safeParse(challengeResponse);
      if (!challengeData || !challengeData.token) {
        console.log("Mencoba endpoint solve (fallback)...");
        const solveResponse = await this.session.post("https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/solve", {
          headers: {
            "content-type": "application/json",
            origin: new URL(targetUrl).origin,
            referer: targetUrl
          },
          body: JSON.stringify({
            sitekey: finalSitekey,
            challenge: challengeData?.challenge || ""
          })
        });
        const solveData = this.safeParse(solveResponse);
        if (solveData && solveData.token) {
          console.log("Turnstile solved successfully!");
          return solveData.token;
        }
      } else {
        console.log("Turnstile solved successfully!");
        return challengeData.token;
      }
      throw new Error("Gagal mendapatkan token. Cloudflare merespon dengan 'invalid' (Browser Environment Check Failed).");
    } catch (error) {
      console.error("Error solving Turnstile:", error.message);
      throw error;
    }
  }
  async close() {
    if (this.session) {
      this.session = null;
    }
    if (this.isInitialized) {
      await destroyTLS();
      this.isInitialized = false;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan untuk mengambil 'chl' data."
    });
  }
  const api = new TurnstileSolver();
  try {
    const data = await api.solve(params);
    return res.status(200).json({
      token: data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan."
    });
  } finally {
    await api.close();
  }
}