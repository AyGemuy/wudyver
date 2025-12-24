import axios from "axios";
class ApiClient {
  constructor(baseURL) {
    console.log("[INIT] Initializing ApiClient...");
    this.BASE_URL = baseURL || "https://www.kimi.com/api";
    this.accessToken = null;
    this.refreshToken = null;
    this.deviceId = this.generateRandomId();
    this.sessionId = this.generateRandomId();
    this.trafficId = this.deviceId;
    const randomVersion = Math.floor(Math.random() * 10) + 125;
    this._axiosInstance = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://www.kimi.com",
        "r-timezone": "Asia/Makassar",
        "sec-ch-ua": `"Lemur";v="${randomVersion}", "Not A(Brand";v="99", "Microsoft Edge";v="${randomVersion}"`,
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomVersion}.0.0.0 Mobile Safari/537.36`,
        "x-language": "zh-CN",
        "x-msh-device-id": this.deviceId,
        "x-msh-platform": "web",
        "x-msh-session-id": this.sessionId,
        "x-traffic-id": this.trafficId
      }
    });
    this._axiosInstance.interceptors.request.use(config => {
      if (this.accessToken) {
        config.headers["Authorization"] = `Bearer ${this.accessToken}`;
      }
      return config;
    }, error => Promise.reject(error));
    console.log("[INIT] ApiClient initialized successfully.");
  }
  generateRandomId(length = 19) {
    return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, "0");
  }
  parseStream(streamData) {
    return streamData.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).filter(line => line && line !== "[DONE]").map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(obj => obj !== null);
  }
  async _ensureAuth() {
    if (!this.accessToken) {
      console.log("[AUTH] Token not found, ensuring authentication...");
      await this.registerDevice();
    }
  }
  async registerDevice() {
    console.log("[START] Registering new device...");
    try {
      const response = await this._axiosInstance.post("/device/register", {});
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      console.log("[SUCCESS] Device registered.");
      return response.data;
    } catch (error) {
      console.error("[FAIL] Error during device registration:", error.message);
      throw error;
    }
  }
  async _poll(apiCallFunction, validationFunction, callName, maxRetries = 10, delay = 1500) {
    console.log(`[POLL START] Starting polling for: ${callName}`);
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const response = await apiCallFunction();
        if (validationFunction(response.data)) {
          console.log(`[POLL SUCCESS] Validation passed for ${callName} on attempt ${retries + 1}.`);
          return response.data;
        }
      } catch (error) {
        console.error(`[POLL FAIL] Attempt ${retries + 1} for ${callName} failed with error: ${error.message}`);
      }
      retries++;
      if (retries < maxRetries) {
        console.log(`[POLL RETRY] Retrying ${callName} in ${delay / 1e3}s... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    console.warn(`[POLL TIMEOUT] Polling for ${callName} timed out after ${maxRetries} retries.`);
    return null;
  }
  async getSuggestions(payload) {
    console.log("[START] getSuggestions with payload:", payload);
    try {
      await this._ensureAuth();
      const apiCall = () => this._axiosInstance.post("/suggestion", payload);
      const validator = data => data && data.items && data.items.length > 0;
      const result = await this._poll(apiCall, validator, "getSuggestions");
      console.log("[SUCCESS] getSuggestions completed.");
      return result;
    } catch (error) {
      console.error("[FAIL] Error in getSuggestions:", error.message);
      throw error;
    }
  }
  async listChats(payload, chatIdToFind) {
    console.log(`[START] listChats to find ID: ${chatIdToFind}`);
    try {
      await this._ensureAuth();
      const apiCall = () => this._axiosInstance.post("/chat/list", payload);
      const validator = data => data && data.items && data.items.some(item => item.id === chatIdToFind);
      const result = await this._poll(apiCall, validator, `listChats for ${chatIdToFind}`);
      console.log("[SUCCESS] listChats completed.");
      return result;
    } catch (error) {
      console.error("[FAIL] Error in listChats:", error.message);
      throw error;
    }
  }
  async getChatHistory(chatId, payload) {
    console.log(`[START] getChatHistory for chat ID: ${chatId}`);
    try {
      await this._ensureAuth();
      const apiCall = () => this._axiosInstance.post(`/chat/${chatId}/segment/scroll`, payload);
      const validator = data => data && data.items && data.items.length >= 2;
      const result = await this._poll(apiCall, validator, `getChatHistory for ${chatId}`);
      console.log("[SUCCESS] getChatHistory completed.");
      return result;
    } catch (error) {
      console.error("[FAIL] Error in getChatHistory:", error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    console.log(`[START] chat process with prompt: "${prompt}"`);
    try {
      await this._ensureAuth();
      console.log("[PROCESS] 1. Creating chat session...");
      const createChatResponse = await this._axiosInstance.post("/chat", {
        name: "Untittled Session",
        born_from: "home",
        kimiplus_id: "kimi",
        is_example: false,
        source: "web",
        tags: []
      });
      const chatId = createChatResponse.data.id;
      const chatInfo = createChatResponse.data;
      console.log(`[PROCESS] Chat created with ID: ${chatId}`);
      const messagesToSend = messages && messages.length ? messages : [{
        role: "user",
        content: prompt
      }];
      const completionPayload = {
        kimiplus_id: "kimi",
        model: "kimi",
        use_search: true,
        refs: [],
        history: [],
        scene_labels: [],
        use_semantic_memory: false,
        ...rest,
        messages: messagesToSend
      };
      console.log("[PROCESS] 2. Executing parallel calls: Stream, List Chats, Suggestions...");
      const [streamResponse, chatList, suggestions] = await Promise.all([this._axiosInstance.post(`/chat/${chatId}/completion/stream`, completionPayload, {
        headers: {
          referer: `https://www.kimi.com/chat/${chatId}`
        },
        responseType: "text"
      }).catch(e => {
        console.error("--\x3e Sub-process 'Stream' failed:", e.message);
        return null;
      }), this.listChats({
        offset: 0,
        size: 5
      }, chatId).catch(e => {
        console.error("--\x3e Sub-process 'ListChats' failed:", e.message);
        return null;
      }), this.getSuggestions({
        query: prompt,
        scene: "first_round"
      }).catch(e => {
        console.error("--\x3e Sub-process 'GetSuggestions' failed:", e.message);
        return null;
      })]);
      if (!streamResponse) throw new Error("Main chat stream failed to execute, process aborted.");
      console.log("[PROCESS] 3. Main chat stream completed.");
      const allEvents = this.parseStream(streamResponse.data);
      const resultText = allEvents.filter(obj => obj && obj.event === "cmpl" && obj.text).map(obj => obj.text).join("");
      console.log("[PROCESS] 4. Finding group_id from stream...");
      const eventWithGroupId = allEvents.find(e => e && e.group_id);
      const groupId = eventWithGroupId ? eventWithGroupId.group_id : null;
      let chatHistory = null;
      let recommendedPrompts = null;
      if (groupId) {
        console.log(`[PROCESS] 5. Found group_id: ${groupId}. Executing parallel calls: History, Recommendations...`);
        const [historyResult, recommendedResult] = await Promise.all([this.getChatHistory(chatId, {
          last: 10
        }).catch(e => {
          console.error("--\x3e Sub-process 'GetHistory' failed:", e.message);
          return null;
        }), this._axiosInstance.post("/chat/recommend-prompt", {
          chat_id: chatId,
          group_id: groupId,
          use_search: true
        }, {
          responseType: "text"
        }).then(res => this.parseStream(res.data)).catch(e => {
          console.error("--\x3e Sub-process 'GetRecommendations' failed:", e.message);
          return null;
        })]);
        chatHistory = historyResult;
        recommendedPrompts = recommendedResult;
      } else {
        console.warn("[PROCESS] Could not find group_id in stream, skipping history and recommendations.");
      }
      console.log("[PROCESS] 6. Assembling final result...");
      const finalResult = {
        ...chatInfo,
        result: resultText,
        all_vents: allEvents,
        chat_list: chatList,
        suggestions: suggestions,
        chat_history: chatHistory,
        recommended_prompts: recommendedPrompts
      };
      console.log("[SUCCESS] chat process completed.");
      return finalResult;
    } catch (error) {
      console.error("[FAIL] Critical error in chat process:", error.message);
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
    const apiClient = new ApiClient();
    const response = await apiClient.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}