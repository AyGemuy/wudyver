import axios from "axios";
import crypto from "crypto";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class Recapio {
  constructor() {
    this.baseURL = "https://api.recapio.com";
    this.webURL = "https://recapio.com";
    this.fingerprint = null;
    this.store = {
      _data: {},
      getItem: key => this.store._data[key] || null,
      setItem: (key, value) => {
        this.store._data[key] = value;
      },
      removeItem: key => {
        delete this.store._data[key];
      },
      init: data => {
        this.store._data = {
          ...data
        };
      }
    };
    this.isRefreshing = false;
    this.failedQueue = [];
    this.cookieJar = new CookieJar();
    this._initStore();
    this._setupAPI();
  }
  _log(message, type = "INFO") {
    console.log(`[${type}] ${message}`);
  }
  _initStore() {
    this.store.init({
      access_token: crypto.randomBytes(16).toString("hex"),
      token_expiration: new Date(Date.now() + 5 * 1e3).toISOString(),
      NEXT_LOCALE: "en"
    });
    this._log("Store initialized with temporary access token");
  }
  _camelToSnakeCase(key) {
    return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  _convertKeysToSnakeCase(obj) {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => this._convertKeysToSnakeCase(item));
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[this._camelToSnakeCase(key)] = this._convertKeysToSnakeCase(obj[key]);
      }
    }
    return newObj;
  }
  _deepParseJsonStrings(obj) {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => this._deepParseJsonStrings(item));
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        let value = obj[key];
        if (typeof value === "string") {
          try {
            const parsedValue = JSON.parse(value);
            if (typeof parsedValue === "object" && parsedValue !== null) {
              value = this._deepParseJsonStrings(parsedValue);
            }
          } catch (e) {}
        } else if (typeof value === "object") {
          value = this._deepParseJsonStrings(value);
        }
        newObj[key] = value;
      }
    }
    return newObj;
  }
  _processQueue(error, token = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }
  async _refreshAccessToken() {
    this._log("Attempting to refresh access token...");
    try {
      const newAccessToken = crypto.randomBytes(16).toString("hex");
      const newExpiration = new Date(Date.now() + 60 * 60 * 1e3).toISOString();
      this.store.setItem("access_token", newAccessToken);
      this.store.setItem("token_expiration", newExpiration);
      this._log("Access token refreshed successfully");
      return newAccessToken;
    } catch (refreshError) {
      this.store.removeItem("access_token");
      this.store.removeItem("token_expiration");
      this._log("Token refresh failed", "ERROR");
      throw refreshError;
    }
  }
  _randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  _randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  async _generateComplexFingerprint() {
    try {
      const complexID = this._randomID(32);
      this._log(`Generated fingerprint: ${complexID.substring(0, 8)}...`);
      return complexID;
    } catch (e) {
      const fallback = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      this._log(`Using fallback fingerprint: ${fallback}`, "WARN");
      return fallback;
    }
  }
  _buildHeaders(extra = {}) {
    const ip = this._randomCryptoIP();
    return {
      Origin: this.webURL,
      Referer: `${this.webURL}/`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "X-Forwarded-For": ip,
      "X-Real-IP": ip,
      "X-Request-ID": this._randomID(8),
      ...extra
    };
  }
  _setupAPI() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        Accept: "application/json, text/plain, */*"
      }
    });
    wrapper(this.api);
    this.api.defaults.jar = this.cookieJar;
    this.api.interceptors.request.use(async config => {
      this._log(`Preparing request to ${config.url}`);
      config.headers["X-App-Language"] = this.store.getItem("NEXT_LOCALE") || "en";
      const accessToken = this.store.getItem("access_token");
      if (accessToken) {
        config.headers["Authorization"] = `Bearer ${accessToken}`;
      }
      if (!this.fingerprint) {
        this.fingerprint = await this._generateComplexFingerprint();
      }
      const isMessagePostRequest = config.url === "/youtube-chat/message" && config.method?.toLowerCase() === "post";
      if (!isMessagePostRequest) {
        config.headers["X-Device-Fingerprint"] = this.fingerprint;
      } else {
        this._log("Skipping X-Device-Fingerprint header for /youtube-chat/message POST request (fingerprint expected in body).");
      }
      const tokenExpiration = this.store.getItem("token_expiration");
      const isTokenValid = accessToken && tokenExpiration && new Date(tokenExpiration) > new Date();
      if (config.method?.toLowerCase() === "get" && config.url?.includes("youtube-chat") && !config.url.includes("fingerprint=") && !config.url.includes("search") && !isTokenValid) {
        const fp = this.fingerprint;
        const separator = config.url.includes("?") ? "&" : "?";
        config.url = `${config.url}${separator}fingerprint=${fp}`;
        this._log(`Appended fingerprint to URL`);
      }
      const spoofedHeaders = this._buildHeaders({});
      Object.assign(config.headers, spoofedHeaders);
      this._log(`Request prepared: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      this._log(`Request error: ${error.message}`, "ERROR");
      return Promise.reject(error);
    });
    this.api.interceptors.response.use(response => {
      this._log(`Received response from ${response.config.url}`);
      return response;
    }, async error => {
      this._log(`Response error from ${error.config?.url}: ${error.response ? error.response.status : error.message}`, "ERROR");
      const originalRequest = error.config;
      if (error.response?.status === 401) {
        if (originalRequest._retry) {
          this.store.removeItem("access_token");
          this.store.removeItem("token_expiration");
          this._log("Authentication failed after retry", "ERROR");
          throw new Error("Authentication failed after token refresh. Please re-authenticate.");
        }
        if (!this.isRefreshing) {
          originalRequest._retry = true;
          this.isRefreshing = true;
          this._log("401 detected, attempting token refresh...");
          try {
            const newAccessToken = await this._refreshAccessToken();
            this._processQueue(null, newAccessToken);
            originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this._processQueue(refreshError);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        } else {
          this._log("Token refresh in progress, queuing request...");
          return new Promise((resolve, reject) => {
            this.failedQueue.push({
              resolve: resolve,
              reject: reject
            });
          });
        }
      }
      if (error.response?.status === 429) {
        this._log("Rate limit (429) detected", "WARN");
        if (error.response.data) {
          throw new Error(`Rate Limit Exceeded: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
      }
      if (error.response?.data) {
        let {
          msg,
          error: apiError,
          message_id,
          current_usage,
          max_credits
        } = error.response.data;
        if (message_id) {
          return Promise.reject(error);
        }
        let errorMessage = msg || apiError;
        let isCreditRelated = typeof current_usage !== "undefined" && typeof max_credits !== "undefined" || errorMessage && (errorMessage.includes("credit") || errorMessage.includes("limit") || errorMessage.includes("will reset"));
        if (errorMessage && !isCreditRelated) {
          throw new Error(`API Error: ${errorMessage}`);
        } else if (!errorMessage) {
          throw new Error("An unexpected API error occurred");
        }
      } else {
        throw new Error("An unexpected API error occurred");
      }
      return Promise.reject(error);
    });
  }
  async _req(method, endpoint, data = {}, headers = {}) {
    try {
      this._log(`Sending ${method.toUpperCase()} request to: ${endpoint}`);
      const res = await this.api({
        method: method,
        url: endpoint,
        data: method !== "get" ? data : undefined,
        params: method === "get" ? data : undefined,
        headers: headers,
        responseType: endpoint.includes("/message") ? "stream" : "json"
      });
      if (endpoint.includes("/message")) {
        let rawData = "";
        const chunks = [];
        await new Promise((resolve, reject) => {
          res.data.on("data", chunk => rawData += chunk.toString());
          res.data.on("end", () => {
            rawData.split("\n").forEach(line => {
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  if (parsed.chunk !== undefined) chunks.push(parsed.chunk);
                } catch (e) {}
              }
            });
            this._log(`SSE message stream fully received from ${endpoint}`);
            resolve();
          });
          res.data.on("error", err => {
            this._log(`SSE Stream error from ${endpoint}: ${err.message}`, "ERROR");
            reject(err);
          });
        });
        return {
          message_response_text: chunks.join("")
        };
      }
      this._log(`Request successful: ${endpoint}`);
      return this._convertKeysToSnakeCase(res.data);
    } catch (error) {
      this._log(`Request failed: ${method.toUpperCase()} ${endpoint} - ${error.message}`, "ERROR");
      throw error;
    }
  }
  async _init(url) {
    this._log(`Initiating chat for URL: ${url}`);
    try {
      const res = await this._req("post", "/youtube-chat/initiate", {
        url: url
      }, {
        "Content-Type": "application/json"
      });
      this._log(`Chat initiation successful. Session ID: ${res.session_id}`);
      return {
        initiate_response: res
      };
    } catch (error) {
      this._log(`Chat initiation failed: ${error.message}`, "ERROR");
      throw error;
    }
  }
  async _genTypes(referer) {
    this._log(`Fetching generation types...`);
    try {
      const res = await this._req("get", "/generate/generation_types", {}, {
        Referer: referer
      });
      this._log("Generation types fetched successfully");
      return {
        generation_types: res
      };
    } catch (error) {
      this._log(`Generation types fetch failed: ${error.message}`, "ERROR");
      throw error;
    }
  }
  async _chatStatus(slug, referer) {
    this._log(`Fetching chat status for slug: ${slug}`);
    try {
      const res = await this._req("get", `/youtube-chat/status/by-slug/${slug}`, {}, {
        Referer: referer
      });
      const parsedData = this._deepParseJsonStrings(res);
      this._log(`Chat status fetched. Processing status: ${parsedData.processing_status}`);
      return {
        chat_status: parsedData
      };
    } catch (error) {
      this._log(`Chat status fetch failed: ${error.message}`, "ERROR");
      throw error;
    }
  }
  async _sendMsg(videoId, message, referer) {
    this._log(`Sending message "${message}" for video ID: ${videoId}`);
    if (!this.fingerprint) {
      this.fingerprint = await this._generateComplexFingerprint();
    }
    try {
      const res = await this._req("post", "/youtube-chat/message", {
        message: message,
        video_id: videoId,
        fingerprint: this.fingerprint
      }, {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "Accept-Language": "en",
        Referer: referer
      });
      this._log("Message sent and response stream processed");
      return res;
    } catch (error) {
      this._log(`Send message failed: ${error.message}`, "ERROR");
      throw error;
    }
  }
  async inspect(url, message = "describe") {
    this._log(`Starting full inspection process for URL: ${url}`);
    try {
      let results = {};
      try {
        const {
          initiate_response
        } = await this._init(url);
        results = {
          ...results,
          initiate_response: initiate_response
        };
      } catch (error) {
        this._log(`Init step failed, skipping: ${error.message}`, "WARN");
      }
      if (!results.initiate_response) {
        this._log("Cannot proceed without initiate_response", "ERROR");
        return results;
      }
      const {
        slug,
        video_id,
        redirect_url
      } = results.initiate_response;
      const digestRefererUrl = `${this.webURL}${redirect_url}`;
      this._log(`Constructed digest referer URL: ${digestRefererUrl}`);
      try {
        const {
          generation_types
        } = await this._genTypes(digestRefererUrl);
        results = {
          ...results,
          generation_types: generation_types
        };
      } catch (error) {
        this._log(`Generation types step failed, skipping: ${error.message}`, "WARN");
      }
      try {
        const {
          chat_status
        } = await this._chatStatus(slug, digestRefererUrl);
        results = {
          ...results,
          chat_status: chat_status
        };
      } catch (error) {
        this._log(`Chat status step failed, skipping: ${error.message}`, "WARN");
      }
      try {
        const {
          message_response_text
        } = await this._sendMsg(video_id, message, digestRefererUrl);
        results = {
          ...results,
          message_response_text: message_response_text
        };
      } catch (error) {
        this._log(`Send message step failed, skipping: ${error.message}`, "WARN");
      }
      this._log("Full inspection process completed");
      return results;
    } catch (error) {
      this._log(`Inspection process failed: ${error.message}`, "ERROR");
      throw error;
    }
  }
  getVideoInfo(results) {
    if (!results || !results.initiate_response) return null;
    return {
      title: results.initiate_response.title,
      videoId: results.initiate_response.video_id,
      slug: results.initiate_response.slug,
      duration: results.initiate_response.duration,
      thumbnailUrl: results.initiate_response.thumbnail_url
    };
  }
  getSummary(results) {
    if (!results || !results.chat_status) return null;
    return results.chat_status.summary;
  }
  getTranscript(results) {
    if (!results || !results.chat_status || !results.chat_status.transcript) return null;
    return results.chat_status.transcript;
  }
  getProcessingStatus(results) {
    if (!results || !results.chat_status) return null;
    return results.chat_status.processing_status;
  }
  getMessageResponse(results) {
    if (!results || !results.message_response_text) return null;
    return results.message_response_text;
  }
  async quickInspect({
    url,
    message = "summarize this video"
  }) {
    this._log("=== QUICK INSPECT START ===");
    try {
      const results = await this.inspect(url, message);
      console.log("\n--- INSPECTION RESULTS ---");
      console.log("Video Info:", this.getVideoInfo(results));
      console.log("Processing Status:", this.getProcessingStatus(results));
      console.log("Summary Available:", !!this.getSummary(results));
      console.log("Transcript Available:", !!this.getTranscript(results));
      console.log("Message Response Available:", !!this.getMessageResponse(results));
      this._log("=== QUICK INSPECT COMPLETE ===");
      return results;
    } catch (error) {
      this._log(`Quick inspect failed: ${error.message}`, "ERROR");
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) return res.status(400).json({
    message: "No url provided"
  });
  try {
    const recapio = new Recapio();
    const result = await recapio.quickInspect(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}