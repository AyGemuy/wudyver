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
import {
  webcrypto
} from "crypto";
class DuckAI {
  constructor() {
    this.apiEndpoint = "https://duckduckgo.com/duckchat/v1/chat";
    this.statusUrl = "https://duckduckgo.com/duckchat/v1/status";
    this.initialUrl = "https://duckduckgo.com/aichat";
    this.feVersionFetchUrl = "https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1";
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    this.secChUa = `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"`;
    this.secChUaMobile = "?0";
    this.secChUaPlatform = `"Windows"`;
    this.acceptLanguage = "en-US,en;q=0.9";
    this.initialCookiesString = "ah=us-en; l=wt-wt; p=-2; dcm=3; dcs=1";
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
  async sleep(durationMs) {
    if (durationMs > 0) {
      await new Promise(resolve => setTimeout(resolve, durationMs));
    }
  }
  sha256B64(text) {
    const hash = CryptoJS.SHA256(text);
    return CryptoJS.enc.Base64.stringify(hash);
  }
  getFixedDomFP() {
    this.log("debug", "Returning fixed DOM fingerprint '6280' as specified.");
    return "6280";
  }
  async runScriptFromString(scriptString) {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>DuckDuckGo</title>
        </head>
        <body>
          <iframe id="jsa" src="about:blank" sandbox="allow-scripts allow-same-origin"></iframe>
        </body>
      </html>
    `, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
      userAgent: this.userAgent,
      url: this.requestOrigin
    });
    const {
      window
    } = dom;
    const {
      document
    } = window;
    try {
      Object.defineProperty(window.navigator, "userAgent", {
        value: this.userAgent,
        writable: false
      });
      Object.defineProperty(window.navigator, "webdriver", {
        value: undefined,
        writable: false
      });
      window.requestAnimationFrame = callback => setTimeout(callback, 0);
      window.cancelAnimationFrame = id => clearTimeout(id);
      const scriptEl = document.createElement("script");
      scriptEl.textContent = scriptString;
      document.body.appendChild(scriptEl);
      await new Promise(resolve => setTimeout(resolve, 100));
      return window.lastResult;
    } catch (error) {
      this.logErr("Error executing script:", error);
      throw error;
    }
  }
  async buildXVqdHash1(vqdHash1Raw) {
    let hashFromDom;
    const n = Date.now();
    try {
      this.log("info", "Decoding raw x-vqd-hash-1 string.");
      const wordArray = CryptoJS.enc.Base64.parse(vqdHash1Raw);
      const jsLiteralString = CryptoJS.enc.Utf8.stringify(wordArray);
      this.log("debug", `Decoded string (first 100 chars): ${jsLiteralString.substring(0, 100)}...`);
      this.log("info", "Executing script in JSDOM to get hash components.");
      try {
        hashFromDom = await this.runScriptFromString(`
          const res = ${jsLiteralString};
          window.lastResult = res;
        `);
      } catch (e) {
        this.logErr("Failed to parse JSDOM script, returning default object.", e);
        hashFromDom = {
          client_hashes: [],
          server_hashes: [],
          meta: {},
          signals: {}
        };
      }
      if (!hashFromDom || !Array.isArray(hashFromDom.client_hashes) || !Array.isArray(hashFromDom.server_hashes)) {
        this.log("warn", "Invalid hash object structure after JSDOM parsing. Missing expected keys or invalid types.");
        hashFromDom = {
          client_hashes: [],
          server_hashes: [],
          meta: {},
          signals: {}
        };
      }
      const client_hashes = await Promise.all((hashFromDom.client_hashes || []).map(async e => {
        const t = new TextEncoder().encode(e);
        const n = await webcrypto.subtle.digest("SHA-256", t);
        const r = new Uint8Array(n);
        return Buffer.from(r).toString("base64");
      }));
      const defaultStack = "at l https://duckduckgo.com/dist/wpm.main.c2092753cfcca2df4cd1.js:1:362167\nat async https://duckduckgo.com/dist/wpm.main.c2092753cfcca2df4cd1.js:1:338979";
      const finalResult = {
        ...hashFromDom,
        client_hashes: client_hashes,
        meta: {
          ...hashFromDom.meta || {},
          origin: this.requestOrigin,
          stack: (hashFromDom.meta && hashFromDom.meta.stack) ?? defaultStack,
          duration: String(Date.now() - n)
        }
      };
      this.log("info", "Encoding final hash object to Base64.");
      const finalResultString = JSON.stringify(finalResult);
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(finalResultString));
    } catch (e) {
      this.logErr("Failed to build x-vqd-hash-1", e);
      throw e;
    }
  }
  async getDefCookies() {
    this.log("info", "Fetching initial URL to establish session cookies.");
    try {
      await this.sleep(1500);
      await this.client.get(this.initialUrl);
      this.log("debug", "Initial URL hit successfully. Cookies are now managed by CookieJar.");
    } catch (e) {
      this.logErr("Failed to hit initial URL for cookies", e);
      throw e;
    }
  }
  async fetchFeVer() {
    const beVersionRegex = /__DDG_BE_VERSION__\s*=\s*"([^"]*)"/;
    const feChatHashRegex = /__DDG_FE_CHAT_HASH__\s*=\s*"([^"]*)"/;
    try {
      this.log("info", "Fetching x-fe-version dynamically...");
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
      this.log("warn", "Could not extract x-fe-version from response. Using fixed value.");
      return "serp_20250808_165827_ET-6a827f0e445029228683";
    } catch (e) {
      this.logErr("Failed to dynamically fetch x-fe-version, using fixed value.", e);
      return "serp_20250808_165827_ET-6a827f0e445029228683";
    }
  }
  async getVQD(retryCount = 0) {
    this.log("info", `Fetching VQD data (Attempt ${retryCount + 1})...`);
    await this.getDefCookies();
    try {
      await this.sleep(1500 * (1 + retryCount * .5));
      const response = await this.client.get(this.statusUrl, {
        headers: {
          accept: "*/*",
          "x-vqd-accept": "1",
          "accept-language": this.acceptLanguage,
          "cache-control": "no-store",
          priority: "u=1, i",
          referer: this.requestOrigin + "/",
          "sec-ch-ua": this.secChUa,
          "sec-ch-ua-mobile": this.secChUaMobile,
          "sec-ch-ua-platform": this.secChUaPlatform,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": this.userAgent
        }
      });
      const hashHeader = response.headers["x-vqd-hash-1"];
      if (!hashHeader) {
        this.log("warn", "Missing x-vqd-hash-1 header in status response. Trying again if retries available.");
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
    metadata = {},
    canUseTools = true,
    canUseApproxLocation = true,
    ...rest
  }) {
    this.log("info", "--- Starting chat request ---");
    const chatMessages = messages.length ? messages : prompt ? [{
      role: "user",
      content: prompt
    }] : [];
    if (!chatMessages.length) {
      throw new Error("No prompt or messages provided for the chat request.");
    }
    const combinedMetadata = {
      toolChoice: {
        NewsSearch: false,
        VideosSearch: false,
        LocalSearch: false,
        WeatherForecast: false
      },
      ...metadata
    };
    const request = {
      model: model,
      messages: chatMessages,
      metadata: combinedMetadata,
      canUseTools: canUseTools,
      canUseApproxLocation: canUseApproxLocation,
      ...rest
    };
    this.log("debug", "Chat request payload:", request);
    try {
      this.log("info", "Step 1: Getting authentication tokens (x-fe-version & VQD)");
      this.chatXfe = await this.fetchFeVer();
      const {
        vqd,
        hash
      } = await this.getVQD();
      const delay = 500 + Math.random() * 500;
      this.log("debug", `Adding ${Math.round(delay)}ms delay to simulate browser behavior.`);
      await this.sleep(delay);
      this.log("info", "Step 2: Building x-vqd-hash-1 for chat request");
      const xVqdHash1 = await this.buildXVqdHash1(hash);
      this.log("debug", `Generated x-vqd-hash-1: ${xVqdHash1}`);
      this.log("info", "Step 3: Preparing chat request headers");
      const feSignals = this.genXFeSig();
      const chatHeaders = {
        accept: "text/event-stream",
        "content-type": "application/json",
        referer: "https://duckduckgo.com/",
        "x-fe-signals": feSignals,
        "x-fe-version": this.chatXfe,
        "x-vqd-hash-1": xVqdHash1,
        "User-Agent": this.userAgent,
        "sec-ch-ua": this.secChUa,
        "sec-ch-ua-mobile": this.secChUaMobile,
        "sec-ch-ua-platform": this.secChUaPlatform
      };
      if (vqd) {
        chatHeaders["x-vqd-4"] = vqd;
      }
      this.log("debug", "Final chat headers:", chatHeaders);
      this.log("info", "Step 4: Sending chat request to API endpoint");
      const response = await this.client.post(this.apiEndpoint, request, {
        headers: chatHeaders
      });
      if (response.status !== 200) {
        throw new Error(`DuckAI API error: ${response.status} ${response.statusText}`);
      }
      this.log("info", "Step 5: Processing API response data");
      const resText = response.data;
      let llmResponse = "";
      for (const line of resText.split("\n")) {
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
        this.log("warn", "Duck.ai returned an empty response.");
        return {
          result: "I apologize, but I'm unable to provide a response at the moment. Please try again.",
          model: model,
          messages: chatMessages
        };
      }
      this.log("info", "Chat completed successfully.");
      return {
        result: finalResponse,
        model: model,
        messages: chatMessages
      };
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
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new DuckAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}