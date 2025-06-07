import fetch from "node-fetch";
class WsupAiClient {
  constructor() {
    this.apiKey = "AIzaSyA9FrPIX08nAnq-JxQxQhBU7r7CMqiPwWY";
    this.appId = "1:829260107773:web:adc187640f19d2c8da1394";
    this.jwtToken = null;
    this.userId = null;
    this.uaId = "ua-38b351c4-13fd-4d36-99e2-220c53efe972";
    this.uaSessionId = "uasess-fa6f2548-0e9b-4ab5-9de0-f9fa06796d93";
    this.reportEventPayload = {
      eventName: "feUptime",
      userId: null,
      age: null,
      gender: null,
      extraData: {
        elapsedTime: 0,
        intervalDurationSecs: 30,
        isSignedIn: false,
        source: "chatScreen"
      },
      uaId: null,
      pageReferrer: "https://www.google.com/",
      wsupUaId: this.uaId,
      wsupUaSessionId: this.uaSessionId,
      uaSessionId: null,
      feOsName: "android",
      feDeviceType: "smartphone",
      client: "nowgg",
      utmCampaign: "NA",
      utmSource: "NA",
      utmMedium: "NA"
    };
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://wsup.ai",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-client-data": this._generateRandomClientData(),
      "x-client-version": "Chrome/JsCore/10.14.0/FirebaseCore-web",
      "x-firebase-client": this._generateFirebaseClientHeader(),
      "x-firebase-gmpid": this.appId
    };
  }
  _generateFirebaseClientHeader() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    const payload = {
      version: 2,
      heartbeats: [{
        agent: "fire-core/0.10.12 fire-core-esm2017/0.10.12 fire-js/ fire-auth/1.7.9 fire-auth-esm2017/1.7.9 fire-js-all-app/10.14.0",
        dates: [formattedDate]
      }]
    };
    return btoa(JSON.stringify(payload));
  }
  _generateRandomClientData() {
    const randomBytes = Array.from({
      length: 6
    }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
    return btoa(randomBytes.join("")).substring(0, 8);
  }
  async _signupAnonymous() {
    const headers = {
      ...this.headers
    };
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        returnSecureToken: true
      })
    });
    if (!res.ok) {
      const error = await res.json();
      console.error("Signup Error:", error);
      throw new Error(`SignUp failed with status ${res.status}: ${JSON.stringify(error)}`);
    }
    const data = await res.json();
    this.jwtToken = data.idToken;
    this.userId = data.localId;
    return data;
  }
  async _getAuthToken() {
    if (!this.jwtToken) {
      await this._signupAnonymous();
    }
    return `WsupV1 ${this.jwtToken}`;
  }
  async _getUserData() {
    const authToken = await this._getAuthToken();
    const headers = {
      ...this.headers,
      Authorization: authToken,
      client: "nowgg",
      "content-type": "application/json",
      origin: "https://wsup.ai",
      priority: "u=1, i",
      referer: "https://wsup.ai/sup-ai",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    const body = {
      ageRange: "21-23",
      gender: "male",
      uaId: null,
      uaSessionId: null,
      wsupUaId: this.uaId,
      wsupUaSessionId: this.uaSessionId,
      feOsName: "android",
      feDeviceType: "smartphone",
      utmCampaign: "NA",
      utmSource: "NA",
      utmMedium: "NA",
      pageReferrer: "https://www.google.com/"
    };
    try {
      const res = await fetch("https://wsup.ai/ai/api/char/v1/users", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("Get User Data Failed Response:", error);
        throw new Error(`Get user data failed with status ${res.status}: ${JSON.stringify(error)}`);
      }
      const userData = await res.json();
      return userData.body.user;
    } catch (error) {
      console.error("Get User Data Error:", error);
      throw error;
    }
  }
  async _initializeReportPayload() {
    try {
      const userData = await this._getUserData();
      this.reportEventPayload.userId = userData.userId;
      this.reportEventPayload.age = userData.ageRange;
      this.reportEventPayload.gender = userData.gender;
      this.reportEventPayload.extraData.isSignedIn = userData.authType !== "anonymous";
    } catch (error) {
      console.error("Failed to initialize report payload:", error);
      this.reportEventPayload.userId = this.userId;
    }
  }
  async _reportEvent(chatId, charId) {
    const authToken = await this._getAuthToken();
    const headers = {
      ...this.headers,
      Authorization: authToken,
      client: "nowgg",
      "content-type": "application/json",
      origin: "https://wsup.ai",
      priority: "u=1, i",
      referer: `https://wsup.ai/sup-ai/dashboard/chats?chatId=${chatId}&charId=${charId}`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    const eventData = {
      ...this.reportEventPayload,
      extraData: {
        ...this.reportEventPayload.extraData,
        elapsedTime: Math.random() * 2e3
      }
    };
    try {
      const res = await fetch("https://wsup.ai/ai/api/stats/v1/reportEvent", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(eventData)
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("Report Event Failed Response:", error);
        throw new Error(`Report event failed with status ${res.status}: ${JSON.stringify(error)}`);
      }
      const responseData = await res.json();
      return responseData;
    } catch (error) {
      console.error("Report Event Error:", error);
      throw error;
    }
  }
  async createSession(charId) {
    const authToken = await this._getAuthToken();
    const headers = {
      ...this.headers,
      Authorization: authToken,
      Referer: "https://wsup.ai/sup-ai/dashboard/characters?category=recommended",
      client: "nowgg"
    };
    const data = {
      userId: this.userId,
      pageReferrer: "NA",
      uaId: null,
      uaSessionId: this.uaSessionId,
      wsupUaId: this.uaId,
      feOsName: "android",
      feDeviceType: "smartphone",
      characterId: charId,
      utmCampaign: "NA",
      utmSource: "NA",
      utmMedium: "NA"
    };
    try {
      const res = await fetch("https://wsup.ai/ai/api/char/v1/session", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("Create Session Failed Response:", error);
        throw new Error(`Create session failed with status ${res.status}: ${JSON.stringify(error)}`);
      }
      const sessionData = await res.json();
      return sessionData;
    } catch (e) {
      console.error("Create Session Error:", e);
      throw e;
    }
  }
  async sendMessage(chatId, charId, content) {
    try {
      await this._reportEvent(chatId, charId);
      const authToken = await this._getAuthToken();
      const headers = {
        ...this.headers,
        Authorization: authToken,
        Referer: `https://wsup.ai/sup-ai/dashboard/chats?chatId=${chatId}&charId=${charId}`,
        client: "nowgg"
      };
      const data = {
        userId: this.userId,
        content: content,
        characterId: charId,
        chatSessionId: chatId,
        requestId: this.generateRequestId(),
        uaId: null,
        uaSessionId: this.uaSessionId,
        wsupUaId: this.uaId,
        feOsName: "android",
        feDeviceType: "smartphone",
        utmCampaign: "NA",
        utmSource: "NA",
        utmMedium: "NA",
        pageReferrer: "NA"
      };
      const res = await fetch("https://wsup.ai/ai/api/char/v1/chat", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorBody = await res.json();
        console.error("Send Message Failed Response:", errorBody);
        throw new Error(`Send message failed with status ${res.status}: ${JSON.stringify(errorBody)}`);
      }
      const messageData = await res.json();
      return messageData;
    } catch (e) {
      console.error("Send Message Error:", e);
      throw e;
    }
  }
  generateRequestId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => (Math.random() * 16 | 0).toString(16));
  }
  async search({
    query
  }) {
    try {
      if (!this.userId) {
        await this._signupAnonymous();
        await this._initializeReportPayload();
      }
      const authToken = await this._getAuthToken();
      const headers = {
        ...this.headers,
        Authorization: authToken,
        Referer: "https://wsup.ai/sup-ai/dashboard/characters?category=recommended",
        client: "nowgg"
      };
      const res = await fetch(`https://wsup.ai/ai/api/char/v1/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: headers
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("Search Error:", error);
        throw new Error(`Search failed with status ${res.status}: ${JSON.stringify(error)}`);
      }
      const searchData = await res.json();
      return searchData;
    } catch (error) {
      console.error("Search Error:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    char_id = "char-uVbUIaz2XvBAcdUts3YfW"
  }) {
    try {
      if (!this.userId) {
        await this._signupAnonymous();
        await this._initializeReportPayload();
      }
      const session = await this.createSession(char_id);
      const chatId = session.body.chatSessionId;
      const charId = session.body.characterId;
      const response = await this.sendMessage(chatId, charId, prompt);
      return response;
    } catch (error) {
      console.error("Chat Error:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "chat | search"
      }
    });
  }
  const client = new WsupAiClient();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | search`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}