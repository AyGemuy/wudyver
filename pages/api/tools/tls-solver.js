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
  async solve({
    url,
    sitekey
  }) {
    if (!this.isInitialized) {
      await this.init();
    }
    try {
      console.log("Loading page...");
      const pageResponse = await this.session.get(url);
      if (!pageResponse.ok) {
        throw new Error(`Failed to load page: ${pageResponse.status}`);
      }
      console.log("Loading Turnstile API...");
      const turnstileApiUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      await this.session.get(turnstileApiUrl);
      console.log("Requesting Turnstile challenge...");
      const challengeResponse = await this.session.post("https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/challenge", {
        headers: {
          "content-type": "application/json",
          origin: new URL(url).origin,
          referer: url
        },
        body: JSON.stringify({
          sitekey: sitekey,
          url: url,
          action: "",
          cData: "",
          chlPageData: ""
        })
      });
      const challengeData = await challengeResponse.json();
      if (!challengeData || !challengeData.token) {
        console.log("Solving challenge...");
        const solveResponse = await this.session.post("https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/solve", {
          headers: {
            "content-type": "application/json",
            origin: new URL(url).origin,
            referer: url
          },
          body: JSON.stringify({
            sitekey: sitekey,
            challenge: challengeData.challenge || ""
          })
        });
        const solveData = await solveResponse.json();
        if (solveData && solveData.token) {
          console.log("Turnstile solved successfully!");
          return solveData.token;
        }
      } else {
        console.log("Turnstile solved successfully!");
        return challengeData.token;
      }
      throw new Error("Failed to obtain Turnstile token");
    } catch (error) {
      console.error("Error solving Turnstile:", error.message);
      throw error;
    }
  }
  async close() {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    if (this.isInitialized) {
      await destroyTLS();
      this.isInitialized = false;
    }
  }
  async getCookies() {
    if (!this.session) {
      throw new Error("Session not initialized");
    }
    return await this.session.cookies();
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url || !params.sitekey) {
    return res.status(400).json({
      error: "Parameter 'url' dan 'sitekey' diperlukan"
    });
  }
  const api = new TurnstileSolver();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}