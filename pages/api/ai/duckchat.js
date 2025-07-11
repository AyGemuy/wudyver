import {
  JSDOM
} from "jsdom";
import axios from "axios";
import CryptoJS from "crypto-js";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookieJarSupport
} from "axios-cookiejar-support";
class DuckAI {
  constructor() {
    this.apiEndpoint = "https://duckduckgo.com/duckchat/v1/chat";
    this.statusUrl = "https://duckduckgo.com/duckchat/v1/status";
    this.initialUrl = "https://duckduckgo.com/aichat";
    this.feVersionFetchUrl = "https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1";
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    this.secChUa = `"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"`;
    this.secChUaMobile = "?0";
    this.secChUaPlatform = `"Windows"`;
    this.acceptLanguage = "id-ID,id;q=0.9";
    this.initialCookiesString = "ah=fr-fr; l=wt-wt; p=-2; dcm=3; dcs=1";
    this.requestOrigin = "https://duckduckgo.com";
    this.cookieJar = new CookieJar();
    this.initCookies();
    this.client = axios.create({
      timeout: 3e4,
      withCredentials: true,
      headers: {
        "User-Agent": this.userAgent,
        "Accept-Language": this.acceptLanguage,
        "Sec-CH-UA": this.secChUa,
        "Sec-CH-UA-Mobile": this.secChUaMobile,
        "Sec-CH-UA-Platform": this.secChUaPlatform,
        Origin: this.requestOrigin
      }
    });
    axiosCookieJarSupport(this.client);
    this.client.defaults.jar = this.cookieJar;
    this.chatXfe = "";
    this.log("info", "DuckAI initialized successfully");
  }
  initCookies() {
    this.log("debug", "Parsing and setting initial cookies into CookieJar.");
    const cookies = this.initialCookiesString.split(";").map(s => s.trim()).filter(Boolean);
    cookies.forEach(cookiePair => {
      const [name, value] = cookiePair.split("=");
      if (name && value) {
        this.cookieJar.setCookieSync(`${name}=${value}`, this.requestOrigin);
      }
    });
    this.log("debug", "Initial cookies set.", this.cookieJar.getCookiesSync(this.requestOrigin));
  }
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [DuckAI:${level.toUpperCase()}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
  logErr(message, error = null) {
    this.log("error", message);
    if (error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: typeof error.response.data === "string" ? error.response.data.substring(0, 500) + "..." : error.response.data
        } : null,
        requestHeaders: error.config?.headers || "N/A"
      });
    }
  }
  setupInt() {
    this.log("debug", "Setting up axios interceptors");
    this.client.interceptors.request.use(config => {
      const commonHeaders = {
        "accept-language": this.acceptLanguage,
        "sec-ch-ua": this.secChUa,
        "sec-ch-ua-mobile": this.secChUaMobile,
        "sec-ch-ua-platform": this.secChUaPlatform,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.userAgent,
        origin: this.requestOrigin
      };
      config.headers = {
        ...commonHeaders,
        ...config.headers
      };
      this.log("debug", `Making ${config.method?.toUpperCase()} request to: ${config.url}`);
      this.log("debug", "Request Headers:", config.headers);
      return config;
    });
    this.client.interceptors.response.use(response => {
      this.log("debug", `Response received: ${response.status} ${response.statusText}`);
      this.log("debug", "Response Headers:", response.headers);
      return response;
    }, error => {
      if (error.response) {
        this.logErr(`HTTP ${error.response.status}: ${error.response.statusText}`, error);
        this.log("debug", "Error Response Headers:", error.response.headers);
      } else if (error.request) {
        this.logErr("Request failed - no response received", error);
      } else {
        this.logErr("Request setup failed", error);
      }
      return Promise.reject(error);
    });
    this.log("debug", "Axios interceptors configured");
  }
  async sleep(durationMs) {
    if (durationMs > 0) {
      await new Promise(resolve => setTimeout(resolve, durationMs));
    }
  }
  sha256B64(text) {
    const hash = CryptoJS.SHA256(text);
    return CryptoJS.enc.Base64.stringify(hash);
  }
  deriveSecChUa(ua) {
    let brands = [];
    let platform = "Unknown";
    let mobile = false;
    if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone") || ua.includes("iPad")) {
      mobile = true;
    }
    if (ua.includes("Windows NT")) {
      platform = "Windows";
    } else if (ua.includes("Macintosh")) {
      platform = "macOS";
    } else if (ua.includes("Android")) {
      platform = "Android";
    } else if (ua.includes("Linux")) {
      platform = "Linux";
    } else if (ua.includes("iOS")) {
      platform = "iOS";
    }
    if (ua.includes("Chrome/")) {
      const chromeVersionMatch = ua.match(/Chrome\/(\d+)\./);
      const chromeVersion = chromeVersionMatch ? chromeVersionMatch[1] : "0";
      brands.push({
        brand: "Lemur",
        version: chromeVersion
      });
      brands.push({
        brand: "",
        version: ""
      });
      brands.push({
        brand: "Microsoft Edge Simulate",
        version: chromeVersion
      });
    } else if (ua.includes("Firefox/")) {
      const firefoxVersionMatch = ua.match(/Firefox\/(\d+)\./);
      const firefoxVersion = firefoxVersionMatch ? firefoxVersionMatch[1] : "0";
      brands.push({
        brand: "Firefox",
        version: firefoxVersion
      });
    } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
      const safariVersionMatch = ua.match(/Version\/(\d+\.\d+).*Safari/);
      const safariVersion = safariVersionMatch ? safariVersionMatch[1] : "0";
      brands.push({
        brand: "Safari",
        version: safariVersion
      });
    }
    const secChUaBrands = brands.map(b => `"${b.brand}";v="${b.version}"`).join(", ");
    return {
      secChUa: secChUaBrands,
      secChUaMobile: mobile ? "?1" : "?0",
      secChUaPlatform: `"${platform}"`
    };
  }
  parseBrandsSecChUa(secChUaString) {
    const brands = [];
    const parts = secChUaString.split(",").map(s => s.trim());
    for (const part of parts) {
      const match = part.match(/"([^"]+)";v="([^"]+)"/);
      if (match) {
        brands.push({
          brand: match[1],
          version: match[2]
        });
      } else if (part === '""') {
        brands.push({
          brand: "",
          version: ""
        });
      }
    }
    return brands;
  }
  getFixedDomFP() {
    this.log("debug", "Returning fixed DOM fingerprint '6280' as specified.");
    return "6280";
  }
  buildXVqdHash1(vqdHash1Raw) {
    try {
      const wordArray = CryptoJS.enc.Base64.parse(vqdHash1Raw);
      const jsLiteralString = CryptoJS.enc.Utf8.stringify(wordArray);
      this.log("debug", `Decoded raw x-vqd-hash-1 string (first 200 chars): ${jsLiteralString.substring(0, 200)}...`);
      const dom = new JSDOM(`<html><body><script>window.hashObject = ${jsLiteralString}</script></body></html>`, {
        runScripts: "dangerously",
        url: this.requestOrigin + "/",
        userAgent: this.userAgent,
        virtualConsole: new JSDOM().virtualConsole,
        resources: "usable",
        pretendToBeVisual: true,
        beforeParse: window => {
          Object.defineProperty(window.navigator, "userAgentData", {
            value: {
              brands: this.parseBrandsSecChUa(this.secChUa),
              mobile: this.secChUaMobile === "?1",
              platform: this.secChUaPlatform.replace(/"/g, "")
            },
            writable: false,
            configurable: true
          });
        }
      });
      const hashFromDom = dom.window.hashObject;
      if (!hashFromDom || !hashFromDom.client_hashes || !hashFromDom.server_hashes || !hashFromDom.meta) {
        throw new Error("Invalid hash object structure after JSDOM parsing. Missing client_hashes, server_hashes, or meta.");
      }
      if (typeof hashFromDom.meta.stack === "string") {
        hashFromDom.meta.stack = hashFromDom.meta.stack.replace(/\\\\n/g, "\n").replace(/\\\\t/g, "\t");
      }
      let rawUserAgent = this.userAgent;
      let rawDomFingerprint = this.getFixedDomFP();
      if (hashFromDom.client_hashes && hashFromDom.client_hashes.length > 0) {
        rawUserAgent = hashFromDom.client_hashes[0];
        this.log("debug", `Extracted raw User Agent from client_hashes[0]: "${rawUserAgent}"`);
        this.userAgent = rawUserAgent;
        const derivedHints = this.deriveSecChUa(this.userAgent);
        this.secChUa = derivedHints.secChUa;
        this.secChUaMobile = derivedHints.secChUaMobile;
        this.secChUaPlatform = derivedHints.secChUaPlatform;
        this.log("debug", "Class User Agent and Client Hints updated based on decoded hash.");
      }
      if (hashFromDom.client_hashes && hashFromDom.client_hashes.length > 1) {
        rawDomFingerprint = hashFromDom.client_hashes[1];
        this.log("debug", `Extracted raw DOM Fingerprint from client_hashes[1]: "${rawDomFingerprint}"`);
      }
      const uaHash = this.sha256B64(rawUserAgent);
      const domHash = this.sha256B64(rawDomFingerprint);
      this.log("debug", `User Agent (for hashing): "${rawUserAgent}"`);
      this.log("debug", `Calculated UA Hash: ${uaHash}`);
      this.log("debug", `DOM Fingerprint Value (for hashing): ${rawDomFingerprint}`);
      this.log("debug", `Calculated DOM Hash: ${domHash}`);
      const finalResult = {
        server_hashes: hashFromDom.server_hashes,
        client_hashes: [uaHash, domHash],
        signals: hashFromDom.signals || {},
        meta: {
          v: hashFromDom.meta.v,
          challenge_id: hashFromDom.meta.challenge_id,
          origin: this.requestOrigin,
          timestamp: hashFromDom.meta.timestamp,
          stack: hashFromDom.meta.stack || "Error\nat https://duckduckgo.com/dist/wpm.chat.12cb9116cc862626ea76.js:1:25430\nat async https://duckduckgo.com/dist/wpm.chat.12cb9116cc862626ea76.js:1:23457"
        }
      };
      this.log("debug", "Final Hash Object before encoding:", finalResult);
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(finalResult)));
    } catch (e) {
      this.logErr("Failed to build x-vqd-hash-1", e);
      return "";
    }
  }
  async getDefCookies() {
    this.log("debug", "getDefaultCookies now primarily serves to hit the initial URL if needed for server-side cookie setting.");
    try {
      await this.sleep(1500);
      await this.client.get(this.initialUrl);
      this.log("debug", "Initial URL hit for cookie establishment. Cookies are now managed by CookieJar.");
    } catch (e) {
      this.logErr("Failed to hit initial URL for cookies", e);
    }
  }
  async fetchFeVer() {
    const beVersionRegex = /__DDG_BE_VERSION__\s*=\s*"([^"]*)"/;
    const feChatHashRegex = /__DDG_FE_CHAT_HASH__\s*=\s*"([^"]*)"/;
    try {
      this.log("debug", "Fetching x-fe-version dynamically...");
      await this.sleep(1500);
      const response = await this.client.get(this.feVersionFetchUrl);
      const content = response.data;
      const beMatch = content.match(beVersionRegex);
      const feMatch = content.match(feChatHashRegex);
      if (beMatch && feMatch) {
        this.chatXfe = `${beMatch[1]}-${feMatch[1]}`;
        this.log("debug", "Dynamically fetched x-fe-version:", this.chatXfe);
        return this.chatXfe;
      }
      this.log("warn", `Could not extract x-fe-version from response using regex. Using fixed value from curl.`);
      return "serp_20250620_202112_ET-12cb9116cc862626ea76";
    } catch (e) {
      this.logErr("Failed to dynamically fetch x-fe-version, using fixed value from curl.", e);
      return "serp_20250620_202112_ET-12cb9116cc862626ea76";
    }
  }
  async getVQD(retryCount = 0) {
    const headers = {
      accept: "*/*",
      "accept-language": this.acceptLanguage,
      "cache-control": "no-store",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-vqd-accept": "1",
      "User-Agent": this.userAgent
    };
    await this.getDefCookies();
    try {
      this.log("debug", `Fetching VQD data (Attempt ${retryCount + 1})...`);
      await this.sleep(1500 * (1 + retryCount * .5));
      const response = await this.client.get(this.statusUrl, {
        headers: headers
      });
      const hashHeader = response.headers["x-vqd-hash-1"];
      if (!hashHeader) {
        this.log("warn", `Missing x-vqd-hash-1 header in status response. Trying again if retries available.`);
        throw new Error(`Status 200 but missing x-vqd-hash-1. Response Headers: ${JSON.stringify(response.headers)}`);
      }
      this.log("debug", "VQD data fetched successfully.", {
        hashHeader: hashHeader
      });
      return {
        vqd: null,
        hash: hashHeader
      };
    } catch (e) {
      this.logErr(`Failed to fetch VQD data (Attempt ${retryCount + 1})`, e);
      if (retryCount < 3) {
        const waitTime = 2 * Math.pow(2, retryCount) * (1 + Math.random()) * 1e3;
        this.log("debug", `Retrying VQD data fetch in ${Math.round(waitTime / 1e3)} seconds.`);
        await this.sleep(waitTime);
        return await this.getVQD(retryCount + 1);
      } else {
        throw new Error(`Failed to fetch VQD data after 3 attempts: ${e.message}`);
      }
    }
  }
  genXFeSig() {
    this.log("info", 'Using fixed "dev-hash" for x-fe-signals.');
    return "dev-hash";
  }
  async chat({
    prompt,
    messages = [],
    model = "gpt-4o-mini",
    metadata = {
      toolChoice: {
        NewsSearch: false,
        VideosSearch: false,
        LocalSearch: false,
        WeatherForecast: false
      }
    },
    canUseTools = true,
    ...rest
  }) {
    const chatMessages = messages.length ? messages : prompt ? [{
      role: "user",
      content: prompt
    }] : [];
    if (!chatMessages.length) {
      throw new Error("No prompt or messages provided for the chat request.");
    }
    const request = {
      messages: chatMessages,
      ...rest
    };
    this.log("info", "--- Starting chat request ---");
    this.log("debug", "Chat request details:", {
      model: request.model,
      messageCount: request.messages?.length,
      canUseTools: request.canUseTools
    });
    try {
      this.log("info", "Step 1: Getting authentication tokens");
      this.chatXfe = await this.fetchFeVer();
      const {
        vqd,
        hash
      } = await this.getVQD();
      const delay = 500 + Math.random() * 500;
      this.log("debug", `Adding ${Math.round(delay)}ms delay to simulate browser behavior`);
      await this.sleep(delay);
      this.log("info", "Step 2: Building x-vqd-hash-1 for chat request");
      const xVqdHash1 = this.buildXVqdHash1(hash);
      this.log("info", "Step 3: Generating additional request headers");
      const feSignals = this.genXFeSig();
      const chatHeaders = {
        accept: "text/event-stream",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: this.requestOrigin,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://duckduckgo.com/",
        "x-fe-signals": feSignals,
        "x-fe-version": this.chatXfe,
        "x-vqd-hash-1": xVqdHash1,
        "User-Agent": this.userAgent,
        "sec-ch-ua": this.secChUa,
        "sec-ch-ua-mobile": this.secChUaMobile,
        "sec-ch-ua-platform": this.secChUaPlatform
      };
      if (vqd === null) {
        delete chatHeaders["x-vqd-4"];
        this.log("debug", "x-vqd-4 header removed as requested (vqd was null).");
      } else {
        chatHeaders["x-vqd-4"] = vqd;
      }
      this.log("debug", "Authentication headers prepared");
      this.log("info", "Step 4: Sending chat request to DuckDuckGo");
      const response = await this.client.post(this.apiEndpoint, request, {
        headers: chatHeaders
      });
      if (response.status === 429) {
        const retryAfter = response.headers["retry-after"];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1e3 : 6e4;
        throw new Error(`Rate limited. Retry after ${waitTime}ms. Status: ${response.status}`);
      }
      if (response.status !== 200) {
        throw new Error(`DuckAI API error: ${response.status} ${response.statusText}`);
      }
      this.log("info", "Step 5: Processing response data");
      const resText = response.data;
      this.log("debug", `Raw response length: ${resText.length} characters`);
      const lines = resText.split("\n");
      this.log("debug", `Processing ${lines.length} response lines`);
      let llmResponse = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.message) {
              llmResponse += json.message;
            }
          } catch (e) {
            this.log("debug", `Skipping invalid JSON line: ${line}`);
          }
        }
      }
      const finalResponse = llmResponse.trim();
      if (!finalResponse) {
        this.log("warn", "Duck.ai returned empty response, using fallback");
        return "I apologize, but I'm unable to provide a response at the moment. Please try again.";
      }
      this.log("info", `Chat completed successfully - response length: ${finalResponse.length} characters`);
      this.log("debug", "Response preview:", finalResponse.substring(0, 100) + (finalResponse.length > 100 ? "..." : ""));
      return finalResponse;
    } catch (error) {
      this.logErr("Chat request failed", error);
      throw error;
    }
  }
  getModels() {
    return ["gpt-4o-mini", "o3-mini", "claude-3-haiku-20240307", "meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mistral-Small-24B-Instruct-2501"];
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const duckAI = new DuckAI();
    const response = await duckAI.chat(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}