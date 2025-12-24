import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class MathfulAutomatedClient {
  constructor() {
    this.BASE_URL = "https://mathful.com";
    this.API_URL = `${this.BASE_URL}/api`;
    this.client = axios.create({
      baseURL: this.BASE_URL,
      timeout: 15e3,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        origin: this.BASE_URL,
        referer: `${this.BASE_URL}/`,
        ...SpoofHead()
      },
      validateStatus: status => true
    });
    this.cookies = {};
    this.csrfToken = "";
    this.deviceId = this._generateDeviceId();
    this.dId = this._generateRandomHex(32);
    this.sessionData = null;
    this._setupInterceptors();
  }
  _toSnakeCase(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(item => this._toSnakeCase(item));
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        newObj[snakeKey] = this._toSnakeCase(obj[key]);
      }
    }
    return newObj;
  }
  _parseStreamedDirectAnswer(directAnswerString) {
    if (!directAnswerString || typeof directAnswerString !== "string") {
      return {
        id: null,
        text: ""
      };
    }
    let aiAnswerId = null;
    let reasoningContent = [];
    const eventBlocks = directAnswerString.split("\n\n").filter(block => block.trim() !== "");
    for (const block of eventBlocks) {
      const lines = block.split("\n").map(line => line.trim());
      let eventType = null;
      let dataContent = null;
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.substring(6).trim();
        } else if (line.startsWith("data:")) {
          dataContent = line.substring(5).trim();
        }
      }
      if (eventType && dataContent) {
        try {
          const jsonData = JSON.parse(dataContent);
          if (eventType === "2006" && jsonData.aiAnswerId) {
            aiAnswerId = jsonData.aiAnswerId;
          } else if (eventType === "2004" && jsonData.reasoning_content !== undefined) {
            reasoningContent.push(jsonData.reasoning_content);
          }
        } catch (e) {
          console.error("Error parsing JSON from directAnswer data:", e, dataContent);
        }
      }
    }
    return {
      id: aiAnswerId,
      text: reasoningContent.join("")
    };
  }
  _parseAiAnswer(aiAnswerArray) {
    if (!aiAnswerArray || !Array.isArray(aiAnswerArray)) {
      return [];
    }
    return aiAnswerArray.filter(item => item && item.result && item.result.data && item.result.data.json && Array.isArray(item.result.data.json)).flatMap(item => item.result.data.json.map(answer => ({
      answer_id: answer.answer_id || null,
      answer: answer.answer || "",
      question: answer.question || "",
      reason_content: answer.reason_content || ""
    })));
  }
  _setupInterceptors() {
    this.client.interceptors.request.use(config => {
      if (Object.keys(this.cookies).length > 0) {
        config.headers["Cookie"] = this._formatCookies();
      }
      return config;
    }, error => {
      console.error("Request Interceptor Error:", error.message);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      this._updateCookies(response);
      return response;
    }, error => {
      console.error("Response Interceptor Error:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      return Promise.reject(error);
    });
  }
  _updateCookies(response) {
    const setCookieHeaders = response.headers["set-cookie"];
    if (setCookieHeaders) {
      setCookieHeaders.forEach(cookieString => {
        const parts = cookieString.split(";")[0].split("=");
        if (parts.length === 2) {
          this.cookies[parts[0].trim()] = parts[1].trim();
        }
      });
    }
  }
  _formatCookies() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  _generateDeviceId() {
    const hex = this._generateRandomHex(32);
    const uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(13, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
    return `anon-${uuid}`;
  }
  _generateRandomHex(length) {
    let result = "";
    const characters = "0123456789abcdef";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  async _getCsrfToken() {
    try {
      console.log("Fetching CSRF token...");
      const response = await this.client.get("/api/auth/csrf", {
        headers: {
          "content-type": "application/json"
        }
      });
      this.csrfToken = response.data.csrfToken;
      console.log("CSRF token obtained.");
      return this.csrfToken;
    } catch (error) {
      console.error("Error fetching CSRF token:", error.message);
      throw new Error(`Failed to get CSRF token: ${error.message}`);
    }
  }
  async _anonymousLoginCallback() {
    try {
      console.log("Initiating anonymous login callback...");
      const data = new URLSearchParams({
        deviceId: this.deviceId,
        redirect: "false",
        deviceNumber: this.dId,
        version: "v1",
        csrfToken: this.csrfToken,
        callbackUrl: `${this.BASE_URL}/`,
        json: "true"
      }).toString();
      const response = await this.client.post("/api/auth/callback/anonymous-user", data, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          referer: `${this.BASE_URL}/`
        }
      });
      console.log("Anonymous login callback successful.");
      return response.data;
    } catch (error) {
      console.error("Error during anonymous login callback:", error.message);
      throw new Error(`Failed anonymous login callback: ${error.message}`);
    }
  }
  async _getSession() {
    try {
      console.log("Fetching user session...");
      const response = await this.client.get("/api/auth/session", {
        headers: {
          "content-type": "application/json",
          referer: `${this.BASE_URL}/`
        }
      });
      this.sessionData = response.data;
      console.log("User session obtained.");
      return this.sessionData;
    } catch (error) {
      console.error("Error fetching session:", error.message);
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }
  async _getDirectAnswer(text, image = "") {
    try {
      console.log(`Fetching direct answer for "${text}"...`);
      const data = {
        text: text,
        image: image
      };
      const response = await this.client.post("/api/generate-answer", data, {
        headers: {
          "content-type": "application/json",
          referer: `${this.BASE_URL}/search?keyword=${encodeURIComponent(text)}`
        }
      });
      console.log("Direct answer received.");
      return response.data;
    } catch (error) {
      console.error("Error fetching direct answer:", error.message);
      throw new Error(`Failed to get direct answer: ${error.message}`);
    }
  }
  async _getAIAnswer(keyword, image = "") {
    try {
      console.log(`Fetching AI answer for "${keyword}"...`);
      const encodedKeyword = encodeURIComponent(keyword);
      const inputData = {
        0: {
          json: {
            keyword: keyword,
            image: image
          }
        },
        1: {
          json: {
            appName: "Tutor"
          }
        },
        2: {
          json: {
            appName: "Tutor"
          }
        },
        3: {
          json: null,
          meta: {
            values: ["undefined"]
          }
        }
      };
      const encodedInput = encodeURIComponent(JSON.stringify(inputData));
      const path = `/api/trpc/tutor.getAIAnswer,subUsage.getSubUsage,subLog.getSubLog,user.find?batch=1&input=${encodedInput}`;
      const response = await this.client.get(path, {
        headers: {
          "content-type": "application/json",
          referer: `${this.BASE_URL}/search?keyword=${encodedKeyword}`
        }
      });
      console.log("AI answer received.");
      return response.data;
    } catch (error) {
      console.error("Error fetching AI answer:", error.message);
      throw new Error(`Failed to get AI answer: ${error.message}`);
    }
  }
  async chat({
    prompt,
    image = ""
  }) {
    console.log(`🚀 Starting chat session for "${prompt}"...`);
    let result = {
      success: false,
      aiAnswer: [],
      directAnswer: {
        id: null,
        text: ""
      },
      sessionId: null,
      csrfToken: null,
      sessionData: null,
      error: null
    };
    try {
      console.log("🔄 Initiating authentication...");
      result.csrfToken = await this._getCsrfToken();
      await this._anonymousLoginCallback();
      const sessionRaw = await this._getSession();
      result.sessionData = sessionRaw ? this._toSnakeCase(sessionRaw) : null;
      result.sessionId = this.cookies["__Secure-next-auth.session-token"] || result.sessionId;
      console.log("✅ Authentication successful.");
      console.log(`🔄 Fetching direct answer for "${prompt}"...`);
      const directAnswerRaw = await this._getDirectAnswer(prompt, image);
      result.directAnswer = this._parseStreamedDirectAnswer(directAnswerRaw);
      console.log("✅ Direct answer obtained.");
      console.log(`🔄 Fetching AI answer (tRPC) for "${prompt}"...`);
      const aiAnswerRaw = await this._getAIAnswer(prompt, image);
      result.aiAnswer = aiAnswerRaw ? this._parseAiAnswer(this._toSnakeCase(aiAnswerRaw)) : [];
      console.log("✅ AI answer (tRPC) obtained.");
      result.success = true;
      console.log("🎉 Mathful chat process completed!");
      return result;
    } catch (error) {
      console.error("🚨 Fatal error in chat method:", error.message);
      result.error = error.message;
      result.success = false;
      return result;
    }
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
    const client = new MathfulAutomatedClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}