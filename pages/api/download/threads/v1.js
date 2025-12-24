import fetch from "node-fetch";
class Downloader {
  constructor() {
    this.firebaseConfig = {
      apiKey: this.decode("QUl6YVN5RE9GWDc4NEhZWFRzX3c2bEpyc1NIOU05U1JtNFB4QVBB"),
      appId: "1:358084965661:android:b88110d77e56ae11b11df4",
      projectId: "358084965661"
    };
    this.baseUrl = "https://firebaseremoteconfig.googleapis.com/v1/projects";
    this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    this.regex = /^(?:https?:\/\/(?:www\.)?[\w.-]+\.[a-z]{2,})?\/(?:@[\w.-]+\/)?post\/([A-Za-z0-9_-]+)/;
  }
  cleanUrl(url) {
    url = url.split("?")[0];
    const lastDigit = url[url.length - 1];
    const isURLClean = lastDigit === "?" || lastDigit === "/";
    if (isURLClean) return this.cleanUrl(url.substring(0, url.length - 1));
    return url;
  }
  extractShortcode(url) {
    url = this.cleanUrl(url);
    const match = url.match(this.regex);
    if (match) return match[1];
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/\s/g, "").replace(/\//g, "") || null;
  }
  shortcodeToId(shortcode) {
    let id = BigInt(0);
    for (const char of shortcode) {
      const index = this.alphabet.indexOf(char);
      if (index === -1) continue;
      id = id * BigInt(64) + BigInt(index);
    }
    return id.toString();
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
  }
  randomId(len) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({
      length: len
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  async getConfig(retries = 3) {
    const endpoint = `${this.baseUrl}/${this.firebaseConfig.projectId}/namespaces/firebase:fetch`;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.firebaseConfig.apiKey
          },
          body: JSON.stringify({
            appId: this.firebaseConfig.appId,
            appInstanceId: this.randomId(22),
            appInstanceIdToken: this.randomId(32),
            countryCode: "ID",
            languageCode: "id-ID",
            platformVersion: "33",
            timeZone: "Asia/Makassar",
            packageName: "com.threads.download",
            sdkVersion: "22.1.2"
          })
        });
        if (!res.ok) throw new Error(`Firebase: ${res.status}`);
        const data = await res.json();
        if (!data.entries) throw new Error("No config entries");
        const config = {};
        for (const [key, value] of Object.entries(data.entries)) {
          config[key] = this.decode(value);
        }
        return config;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1e3 * (i + 1)));
      }
    }
    throw new Error("Failed to get config");
  }
  async fetchPost(config, threadId, retries = 2) {
    const baseUrl = config.GF6ept1ofN || "https://www.threads.net/api/graphql";
    const url = new URL(baseUrl);
    const reqConfig = config.H3p9RdLg5v || {};
    const headers = config.B12fc46JFL || {};
    const variables = {
      ...reqConfig.variables || {},
      postID: threadId
    };
    url.searchParams.set("variables", JSON.stringify(variables));
    url.searchParams.set("doc_id", reqConfig.doc_id || "23917460264622451");
    url.searchParams.set("lsd", reqConfig.lsd || "AVoFqAWt10I");
    url.searchParams.set("server_timestamps", "true");
    const reqHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": headers["User-Agent"] || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "X-IG-App-ID": headers["X-Ig-App-Id"] || "238260118697367",
      "X-CSRFTOKEN": reqConfig.__csr || "",
      "X-FB-LSD": reqConfig.lsd || "AVoFqAWt10I",
      "X-ASBD-ID": "359341",
      "Sec-Fetch-Site": "same-origin"
    };
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url.toString(), {
          method: "POST",
          headers: reqHeaders
        });
        if (!res.ok) throw new Error(`Threads: ${res.status}`);
        return await res.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  async download({
    url
  }) {
    try {
      const shortcode = this.extractShortcode(url);
      if (!shortcode) {
        return {
          success: false,
          error: "Invalid URL - cannot extract shortcode"
        };
      }
      const threadId = this.shortcodeToId(shortcode);
      console.log(`[+] Shortcode: ${shortcode} → ID: ${threadId}`);
      console.log("[*] Getting config...");
      const config = await this.getConfig();
      console.log("[*] Fetching post...");
      const response = await this.fetchPost(config, threadId);
      const edges = response?.data?.data?.edges;
      if (!edges || edges.length === 0) {
        return {
          success: false,
          error: "No data found in response"
        };
      }
      const postData = edges[0]?.node;
      if (!postData) {
        return {
          success: false,
          error: "Invalid post data structure"
        };
      }
      console.log("[✓] Success\n");
      return postData;
    } catch (error) {
      console.error(`[✗] ${error.message}\n`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const threads = new Downloader();
  try {
    const data = await threads.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}