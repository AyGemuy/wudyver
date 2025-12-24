import axios from "axios";
import {
  randomUUID
} from "crypto";

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
class BlackboxAI {
  constructor() {
    this.sessionId = randomUUID();
    this.csrfToken = null;
    this.baseURL = "https://www.blackbox.ai";
  }
  async getCsrfToken() {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      cookie: `sessionId=${this.sessionId}`,
      referer: `${this.baseURL}/`,
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    const res = await axios.get(`${this.baseURL}/api/auth/csrf`, {
      headers: headers
    });
    this.csrfToken = res.data?.csrfToken;
    if (!this.csrfToken) throw new Error("Failed to retrieve CSRF token");
  }
  async sendMessage(options = {}) {
    if (!this.csrfToken) await this.getCsrfToken();
    const headers = {
      ...this.defaultHeaders(),
      cookie: `sessionId=${this.sessionId}; __Host-authjs.csrf-token=${this.csrfToken}`
    };
    const defaultData = {
      messages: options.messages || [{
        role: "user",
        prompt: options.prompt,
        id: options.messageId || "nQZpvCa"
      }],
      agentMode: {},
      id: "yPc8i72",
      previewToken: null,
      userId: null,
      codeModelMode: true,
      trendingAgentMode: {},
      isMicMode: false,
      userSystemPrompt: null,
      maxTokens: 1024,
      playgroundTopP: null,
      playgroundTemperature: null,
      isChromeExt: false,
      githubToken: "",
      clickedAnswer2: false,
      clickedAnswer3: false,
      clickedForceWebSearch: false,
      visitFromDelta: false,
      isMemoryEnabled: false,
      mobileClient: false,
      userSelectedModel: null,
      validated: "00f37b34-a166-4efb-bce5-1312d87f2f94",
      imageGenerationMode: false,
      webSearchModePrompt: true,
      deepSearchMode: false,
      domains: null,
      vscodeClient: false,
      codeInterpreterMode: false,
      customProfile: {
        name: "",
        occupation: "",
        traits: [],
        additionalInfo: "",
        enableNewChats: false
      },
      session: null,
      isPremium: false,
      subscriptionCache: null,
      beastMode: false,
      reasoningMode: false
    };
    const data = deepMerge(defaultData, options);
    const res = await axios.post(`${this.baseURL}/api/chat`, data, {
      headers: headers
    });
    return res.data;
  }
  defaultHeaders() {
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      referer: `${this.baseURL}/`,
      origin: this.baseURL,
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  const ai = new BlackboxAI();
  try {
    const data = await ai.sendMessage(params);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}