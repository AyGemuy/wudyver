import axios from "axios";
import Crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
class ChatGDIAPI {
  constructor(baseURL = "https://api.chatgdi.com", requestHeader = {}) {
    this.baseURL = baseURL;
    this.requestHeader = requestHeader || this.getDefaultRequestHeader();
  }
  v4() {
    return uuidv4();
  }
  md5Hex(content) {
    return Crypto.createHash("md5").update(content).digest("hex");
  }
  getLang() {
    const langMap = {
      zh: "zh-Hans-CN",
      "zh-CN": "zh-Hans-CN",
      "zh-TW": "zh-Hant-TW",
      en: "en-US",
      es: "es-ES"
    };
    return langMap["en"] || "en-US";
  }
  getHeaderParam(header, key) {
    if (!header) return "";
    return header[key] || header[key.toLowerCase()] || "";
  }
  getDefaultRequestHeader() {
    return {
      "X-Client-Type": "ChatGAiPro",
      "X-Client-System": "web",
      "X-Client-Version": "1.1.0",
      "X-Client-Language": this.getLang()
    };
  }
  generateSSAID() {
    return this.v4().replace(/-/g, "");
  }
  getPCHeaders(config) {
    const r = this.v4();
    const s = Date.now();
    const contentToSign = "a8259a2f-4a50-f787-d27b-d422571aebe2" + "\n" + (config.method.toUpperCase() || "GET") + "\n" + (config.path || config.url) + "\n" + s + "\n" + r + "\n" + (config.body || (config.data ? JSON.stringify(config.data) : "") || "") + "\n";
    const i = this.md5Hex(contentToSign);
    const accessToken = this.getHeaderParam(this.requestHeader, "Authorization") || "";
    const bearerToken = accessToken && accessToken.includes("Bearer ") ? accessToken : accessToken ? "Bearer " + accessToken : "Bearer null";
    let headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      authorization: bearerToken,
      "content-type": "application/json",
      origin: "https://chatgai.lovepor.cn",
      priority: "u=1, i",
      referer: "https://chatgai.lovepor.cn/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "X-Client-Language": this.getHeaderParam(this.requestHeader, "X-Client-Language") || this.getLang(),
      "X-Client-Sign": i,
      "X-Client-System": "web",
      "X-Client-Type": this.getHeaderParam(this.requestHeader, "X-Client-Type") || "ChatGAiPro",
      "X-Client-Request-Uuid": r,
      "X-Client-Timestamp": s.toString(),
      "X-Client-Token": this.getHeaderParam(this.requestHeader, "X-Client-Token") || "",
      "X-Client-Version": this.getHeaderParam(this.requestHeader, "X-Client-Version") || "1.1.0",
      "X-Client-SSAID": this.getHeaderParam(this.requestHeader, "ssaid") || this.generateSSAID(),
      "X-Client-Source": "abroad",
      "X-Process-Client": "web"
    };
    if (this.getHeaderParam(this.requestHeader, "X-Client-Type") === "ChatGoWeb") {
      headers["X-Client-Type"] = "ChatGAiPro";
    }
    return headers;
  }
  parseStreamData(data) {
    const lines = data.split("\n");
    const result = {
      content: "",
      complete: false
    };
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const jsonData = JSON.parse(line.substring(6));
          if (jsonData.t === 1 && jsonData.v) {
            result.content += jsonData.v;
          } else if (jsonData.t === 2) {
            result.complete = true;
          }
        } catch (e) {
          console.error("Failed to parse JSON:", e);
        }
      }
    }
    return result;
  }
  async chat({
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      const endpoint = "/api/v6/ai/communications";
      const messageData = messages.length ? messages : [{
        role: "user",
        content: prompt
      }];
      const requestBody = {
        messages: messageData,
        ...rest
      };
      const config = {
        method: "POST",
        url: endpoint,
        data: requestBody,
        path: endpoint
      };
      const headers = this.getPCHeaders(config);
      const response = await axios.post(`${this.baseURL}${endpoint}`, requestBody, {
        headers: headers,
        timeout: 6e4
      });
      return this.parseStreamData(response.data);
    } catch (error) {
      console.error("Chat request failed:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error:", error.message);
      }
      throw error;
    }
  }
  async request(config) {
    try {
      const fullConfig = {
        method: config.method || "GET",
        url: config.url,
        path: config.url.split("?")[0],
        data: config.data,
        params: config.params,
        body: config.body
      };
      const headers = this.getPCHeaders(fullConfig);
      const response = await axios({
        method: fullConfig.method.toLowerCase(),
        url: `${this.baseURL}${fullConfig.url}`,
        data: fullConfig.data,
        params: fullConfig.params,
        headers: {
          ...headers,
          ...config.headers
        },
        timeout: config.timeout || 3e4
      });
      return response.data;
    } catch (error) {
      console.error(`Request to ${config.url} failed:`, error);
      throw error;
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
    const api = new ChatGDIAPI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}