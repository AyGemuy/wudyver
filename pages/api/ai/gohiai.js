import axios from "axios";
import CryptoJS from "crypto-js";
import Qs from "qs";
import WebSocket from "ws";
const config = () => ({
  public: {
    env: "production",
    apiBase: "https://api.gohiai.com/",
    signKey: "5bAzcHdC0udbtarX",
    aesKey: "W9vXZDaIVAKn2jAb",
    siteUrl: "https://www.gohiai.com",
    socketPath: "stream.gohiai.com"
  }
});
const _mockStorage = {};
const storage = {
  set: (key, value) => {
    _mockStorage[key] = value;
  },
  get: key => _mockStorage[key],
  remove: key => {
    delete _mockStorage[key];
  }
};
const PROFILE_KEY = "profile";
let _profileCache = undefined;

function generateRandomString(length = 32) {
  const characters = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
  const charactersLength = characters.length;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getProfileId() {
  if (!_profileCache) {
    _profileCache = generateRandomString(24);
  }
  return _profileCache;
}

function getUserProfile() {
  let profile = storage.get(PROFILE_KEY);
  if (!profile) {
    profile = generateRandomString(24);
    setUserProfile(profile);
  }
  return profile;
}

function setUserProfile(profile) {
  storage.set(PROFILE_KEY, profile);
  return profile;
}
const AUTH_KEY = "auth";

function getAuthToken() {
  const authData = storage.get(AUTH_KEY);
  if (authData) {
    try {
      const parsedData = JSON.parse(authData);
      return parsedData && parsedData.authToken;
    } catch (error) {
      console.error("Error parsing auth token:", error.message);
      return null;
    }
  }
  return null;
}

function decryptData(key, iv, encryptedBase64) {
  let decrypted = "";
  try {
    const parsedKey = CryptoJS.enc.Utf8.parse(key);
    const parsedIv = CryptoJS.enc.Utf8.parse(iv);
    const parsedEncrypted = CryptoJS.enc.Base64.parse(encryptedBase64);
    const decryptedBytes = CryptoJS.AES.decrypt(CryptoJS.enc.Base64.stringify(parsedEncrypted), parsedKey, {
      iv: parsedIv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Error decrypting data:", error.message);
  }
  return decrypted;
}

function generateGetSignature(params, requestId, timestamp, signKey) {
  if (!params) return CryptoJS.MD5(`${requestId}${timestamp}${signKey}`);
  const sortedKeys = Object.keys(params).sort().reverse();
  const sortedParams = {};
  sortedKeys.forEach(key => {
    sortedParams[key] = params[key];
  });
  const queryString = Qs.stringify(sortedParams, {
    encode: false
  });
  return CryptoJS.MD5(`${queryString}${requestId}${timestamp}${signKey}`);
}

function generatePostSignature(data, requestId, timestamp, signKey) {
  let signString = `${requestId}${timestamp}${signKey}`;
  if (data) {
    signString = `${JSON.stringify(data)}${signString}`;
  }
  return CryptoJS.MD5(signString);
}

function generateWebSocketSignature(did, requestId, timestamp, signKey) {
  return CryptoJS.MD5(`${did}${requestId}${timestamp}${signKey}`).toString();
}

function generateWebSocketMessageSignature({
  requestId,
  event,
  data,
  ts,
  salt,
  secret
}) {
  if (!requestId || !event || !ts || !secret) return;
  let signatureString = `${requestId}${event}`;
  if (data) {
    signatureString += data;
  }
  signatureString += ts;
  if (salt) {
    signatureString += salt;
  }
  signatureString += secret;
  return CryptoJS.MD5(signatureString).toString();
}

function getPlatform() {
  return "pc";
}

function parseApiResponseData(timestamp, did, aesKey, encryptedData) {
  if (!encryptedData) return {};
  const signatureHash = CryptoJS.MD5(`${CryptoJS.MD5(`${did}${timestamp}`)}${aesKey}`).toString();
  const key = signatureHash.slice(0, 16);
  const iv = signatureHash.slice(16);
  const decrypted = decryptData(key, iv, encryptedData);
  try {
    return decrypted ? JSON.parse(decrypted) : {};
  } catch (error) {
    console.error("Error parsing decrypted data:", error.message);
    return {};
  }
}
const _mockI18n_global = {
  localeProperties: {
    value: {
      iso: "en-US"
    }
  }
};
const _mockArms_global = {
  getTraceId: () => ({
    "EagleEye-TraceID": generateRandomString(16)
  }),
  api: logData => {},
  avg: (key, value) => {}
};
const showUIMessage = msg => {
  console.log("[UI Message]", msg);
};
const translate = () => key => `Translated: ${key}`;
class GoHIAAIAPI {
  constructor() {
    this.config = config();
    this.axiosInstance = null;
    this.headers = null;
    this.initializeAxios();
    this.wsSocket = null;
    this.wsSalt = undefined;
    this.wsCallbacks = new Map();
    this.nextCallbackId = 0;
    this.wsMessageStartTime = undefined;
    this.dialogueId = null;
    this.lastUserMessageMid = null;
    this.lastAiMessageMid = null;
    console.log("GoHIAAIAPI initialized.");
  }
  createWebSocketInstance() {
    const publicConfig = this.config.public;
    const did = getProfileId();
    const locale = _mockI18n_global.localeProperties.value.iso;
    const requestId = generateRandomString();
    const profile = getUserProfile();
    const timestamp = Date.now();
    const url = `wss://${publicConfig.socketPath}/s/stream/w/message`;
    const sign = generateWebSocketSignature(did, requestId, timestamp, publicConfig.signKey);
    const protocolObj = {
      did: did,
      pf: getPlatform(),
      lth: locale,
      requestId: requestId,
      sign: sign,
      ts: timestamp,
      profile: profile
    };
    const secWebSocketProtocol = Buffer.from(JSON.stringify(protocolObj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const wsHeaders = {
      Upgrade: "websocket",
      Origin: publicConfig.siteUrl,
      "Cache-Control": "no-cache",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Pragma: "no-cache",
      Connection: "Upgrade",
      "Sec-WebSocket-Key": CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(16)),
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
    };
    console.log("WebSocket URL:", url);
    console.log("WebSocket Request Headers (partial log):");
    for (const key in wsHeaders) {
      if (key === "Sec-WebSocket-Protocol") console.log(`  ${key}: ${secWebSocketProtocol}`);
      else if (key === "Sec-WebSocket-Key") console.log(`  ${key}: ${wsHeaders[key]}`);
      else console.log(`  ${key}: ${wsHeaders[key]}`);
    }
    const ws = new WebSocket(url, [secWebSocketProtocol], {
      headers: wsHeaders,
      rejectUnauthorized: false,
      perMessageDeflate: true
    });
    ws.on("open", () => {
      console.log("WebSocket Connection Opened!");
    });
    ws.on("error", error => {
      console.error("WebSocket Connection Error:", error.message);
      console.error("Full Error Object:", error);
    });
    ws.on("close", (code, reason) => {
      console.log(`WebSocket Connection Closed! Code: ${code}, Reason: ${reason ? reason.toString() : "No Reason"}`);
    });
    return ws;
  }
  closeWebSocket() {
    if (this.wsSocket) {
      console.log("Closing WebSocket connection...");
      this.wsSocket.close();
    }
    this.wsSocket = undefined;
    this.wsCallbacks.clear();
    this.nextCallbackId = 0;
    console.log("WebSocket connection closure sequence initiated.");
  }
  sendWebSocketMessage(messageData) {
    console.log("Preparing to send message...");
    const timestamp = Date.now();
    const signature = generateWebSocketMessageSignature({
      requestId: messageData.requestId,
      event: messageData.event,
      data: messageData.data,
      ts: timestamp,
      salt: this.wsSalt,
      secret: this.config.public.signKey
    });
    const payload = {
      requestId: messageData.requestId,
      sign: signature,
      event: messageData.event,
      data: messageData.data,
      ts: timestamp
    };
    const payloadString = JSON.stringify(payload);
    if (this.wsSocket && this.wsSocket.readyState === WebSocket.OPEN) {
      console.log("Sending message:", messageData.event, "with data length:", payloadString.length);
      this.wsSocket.send(payloadString);
    } else {
      console.log("Socket not open or connecting, ensuring connection and sending...");
      this.ensureWebSocketConnected().then(() => {
        if (this.wsSocket && this.wsSocket.readyState === WebSocket.OPEN) {
          console.log("Re-established, sending message:", messageData.event);
          this.wsSocket.send(payloadString);
        } else {
          console.error("Failed to send message: WebSocket still not open after attempting reconnection.");
        }
      }).catch(err => {
        console.error("Failed to establish WebSocket connection for sending message:", err.message);
      });
    }
  }
  setupWebSocketHandlers() {
    if (!this.wsSocket) {
      console.warn("setupWebSocketHandlers called but wsSocket is null.");
      return;
    }
    this.wsSocket.onmessage = event => {
      console.log("WebSocket Message received!");
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(event.data);
        console.log("WebSocket Message Data:", parsedMessage);
      } catch (e) {
        console.error("Error parsing WebSocket message data:", e);
        return;
      }
      if (parsedMessage.event === "server_initialize_completed") {
        try {
          const initData = JSON.parse(parsedMessage.data);
          if (initData.salt) {
            this.wsSalt = initData.salt;
            console.log(`Server salt received: ${this.wsSalt}`);
          }
        } catch (e) {
          console.error("Error parsing server_initialize_completed data:", e);
        }
      }
      if (parsedMessage.event === "server_receive_message") {
        this.wsMessageStartTime = Date.now();
        console.log("Server received message event. Starting timer.");
      }
      if (parsedMessage.event === "server_stream_push_start" || parsedMessage.event === "server_push_message") {
        if (this.wsMessageStartTime) {
          const responseTime = Date.now() - this.wsMessageStartTime;
          const domain = this.config.public.siteUrl.replace(/\/$/, "").replace(/(https:\/\/)|(http:\/\/)/, "");
          _mockArms_global.api({
            api: `wss://${this.config.public.socketPath}/s/stream/w/message`,
            success: true,
            time: responseTime,
            code: 200,
            domain: domain
          });
          _mockArms_global.avg("chat_response_time", responseTime);
          console.log(`Response time for stream/push: ${responseTime}ms`);
          this.wsMessageStartTime = undefined;
        }
      }
      this.wsCallbacks.forEach(cb => cb.call(this, parsedMessage));
    };
    this.wsSocket.onerror = error => {
      console.error("WebSocket Error:", error.message);
    };
    this.wsSocket.onclose = () => {
      this.wsSocket = undefined;
      console.warn("WebSocket closed.");
    };
  }
  subscribeWebSocket(callback) {
    const id = this.nextCallbackId++;
    this.wsCallbacks.set(id, callback);
    console.log(`Subscribed WebSocket callback, ID: ${id}`);
    return id;
  }
  unsubscribeWebSocket(callbackId) {
    if (this.wsCallbacks.delete(callbackId)) {
      console.log(`Unsubscribed WebSocket callback ID: ${callbackId}`);
    } else {
      console.warn(`Unsubscribe failed: callback ID ${callbackId} not found.`);
    }
  }
  async ensureWebSocketConnected() {
    console.log(`Current WS state: ${this.wsSocket ? this.wsSocket.readyState : "null"}`);
    if (!this.wsSocket || this.wsSocket.readyState === WebSocket.CLOSED) {
      console.log("WebSocket is closed or null, creating new connection.");
      this.wsSocket = this.createWebSocketInstance();
      this.setupWebSocketHandlers();
      return new Promise((resolve, reject) => {
        this.wsSocket.onopen = () => {
          console.log("WebSocket connection opened successfully.");
          resolve();
        };
        this.wsSocket.onerror = err => {
          console.error("WebSocket Error during connection attempt:", err.message);
          console.error("Full Error Object during attempt:", err);
          this.wsSocket = undefined;
          reject(new Error(`WebSocket connection failed. Original error: ${err.message}`));
        };
        this.wsSocket.onclose = event => {
          console.log(`WebSocket closed during connection attempt. Code: ${event.code}, Reason: ${event.reason ? event.reason.toString() : "No Reason"}`);
          this.wsSocket = undefined;
          if (!event.wasClean) {
            reject(new Error("WebSocket connection closed uncleanly."));
          }
        };
      });
    } else if (this.wsSocket.readyState === WebSocket.CONNECTING) {
      console.log("WebSocket is currently connecting, waiting for open state.");
      return new Promise((resolve, reject) => {
        const onOpen = () => {
          console.log("WebSocket connected (after pending).");
          this.wsSocket.removeEventListener("open", onOpen);
          this.wsSocket.removeEventListener("error", onError);
          this.wsSocket.removeEventListener("close", onClose);
          resolve();
        };
        const onError = err => {
          console.error("WebSocket Error during pending connection:", err.message);
          console.error("Full Error Object during pending:", err);
          this.wsSocket.removeEventListener("open", onOpen);
          this.wsSocket.removeEventListener("error", onError);
          this.wsSocket.removeEventListener("close", onClose);
          this.wsSocket = undefined;
          reject(new Error(`WebSocket connection failed during handshake. Original error: ${err.message}`));
        };
        const onClose = event => {
          console.log(`WebSocket closed during pending connection. Code: ${event.code}, Reason: ${event.reason ? event.reason.toString() : "No Reason"}`);
          this.wsSocket.removeEventListener("open", onOpen);
          this.wsSocket.removeEventListener("error", onError);
          this.wsSocket.removeEventListener("close", onClose);
          this.wsSocket = undefined;
          if (!event.wasClean) {
            reject(new Error("WebSocket connection closed uncleanly during pending state."));
          }
        };
        this.wsSocket.addEventListener("open", onOpen);
        this.wsSocket.addEventListener("error", onError);
        this.wsSocket.addEventListener("close", onClose);
      });
    }
    console.log("WebSocket already open. Proceeding.");
    return Promise.resolve();
  }
  initializeAxios() {
    const publicConfig = this.config.public;
    const commonHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": _mockI18n_global.localeProperties.value.iso,
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: publicConfig.siteUrl,
      referer: publicConfig.siteUrl + "/",
      platform: getPlatform(),
      lth: _mockI18n_global.localeProperties.value.iso,
      did: getProfileId(),
      profile: getUserProfile(),
      token: getAuthToken() || "",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      priority: "u=1, i"
    };
    this.headers = commonHeaders;
    this.axiosInstance = axios.create({
      timeout: 3e4,
      baseURL: publicConfig.apiBase,
      headers: commonHeaders
    });
    this.axiosInstance.interceptors.request.use(config => {
      console.log(`Axios Request: ${config.method.toUpperCase()} ${config.url}`);
      config.headers.lth = _mockI18n_global.localeProperties.value.iso;
      return config;
    }, error => {
      console.error("Axios Request Error:", error.message);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      const statusCode = response.status;
      if (statusCode >= 200 && statusCode < 300 || statusCode === 304) {
        const responseData = response.data;
        const decryptedData = parseApiResponseData(responseData.ts?.toString(), getProfileId(), publicConfig.aesKey, responseData.data);
        console.log(`Axios Response: ${response.config.url} Status: ${statusCode}, Code: ${responseData.code}`);
        return Promise.resolve({
          ts: responseData.ts,
          code: responseData.code,
          data: decryptedData
        });
      } else {
        console.error(`Axios Response Error: Status ${statusCode}, Message: ${response.statusText}`);
        return Promise.reject(response);
      }
    }, error => {
      console.error("Axios Response Error Catch:", error.message);
      return Promise.reject(error);
    });
    console.log("Axios initialized.");
  }
  async get(url, params = {}, customHeaders = {}) {
    const timestamp = Date.now();
    const requestId = generateRandomString();
    const signature = generateGetSignature(params, requestId, timestamp, this.config.public.signKey);
    const startTime = Date.now();
    const traceId = _mockArms_global.getTraceId()["EagleEye-TraceID"];
    try {
      const response = await this.axiosInstance({
        method: "get",
        url: url,
        params: params,
        headers: {
          ...customHeaders,
          "req-sign": signature.toString(),
          "req-id": requestId,
          "req-ts": timestamp
        }
      });
      _mockArms_global.api({
        api: url,
        success: true,
        time: Date.now() - startTime,
        code: response.code || 200,
        msg: `rescode:${response.code || "N/A"}`,
        traceId: traceId,
        domain: this.config.public.siteUrl.replace(/\/$/, "").replace(/(https:\/\/)|(http:\/\/)/, ""),
        c1: JSON.stringify(params)
      });
      if (response.code === 0) {
        console.log(`API Success: GET ${url}`);
        return response.data;
      } else {
        showUIMessage(translate()("no-service"));
        const errorMessage = `API Error: Code ${response.code}, Message: ${response.msg || "Unknown error"}`;
        console.error(`API Failed: GET ${url}: ${errorMessage}`);
        if (url === "/s/w/character/detail") throw new Error(`Character detail request failed. ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorCode = error.response ? error.response.status : error.code || null;
      const errorMessage = error.message || "Unknown error";
      console.error(`API Error Catch: GET ${url}: ${errorMessage}`);
      _mockArms_global.api({
        api: url,
        success: false,
        time: Date.now() - startTime,
        code: errorCode,
        msg: errorMessage,
        traceId: traceId,
        domain: this.config.public.siteUrl.replace(/\/$/, "").replace(/(https:\/\/)|(http:\/\/)/, "")
      });
      throw error;
    }
  }
  async post(url, data = {}, customHeaders = {}) {
    const timestamp = Date.now();
    const requestId = generateRandomString();
    const signature = generatePostSignature(data, requestId, timestamp, this.config.public.signKey);
    const startTime = Date.now();
    const traceId = _mockArms_global.getTraceId()["EagleEye-TraceID"];
    try {
      const response = await this.axiosInstance({
        method: "post",
        url: url,
        data: data,
        headers: {
          ...customHeaders,
          "req-sign": signature.toString(),
          "req-id": requestId,
          "req-ts": timestamp,
          "Content-Type": "application/json;charset=UTF-8"
        }
      });
      _mockArms_global.api({
        api: url,
        success: true,
        time: Date.now() - startTime,
        code: response.code || 200,
        msg: `rescode:${response.code || "N/A"}`,
        traceId: traceId,
        domain: this.config.public.siteUrl.replace(/\/$/, "").replace(/(https:\/\/)|(http:\/\/)/, "")
      });
      if (response.code === 0) {
        console.log(`API Success: POST ${url}`);
        return response.data;
      } else {
        showUIMessage(translate()("no-service"));
        const errorMessage = `API Error: Code ${response.code}, Message: ${response.msg || "Unknown error"}`;
        console.error(`API Failed: POST ${url}: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorCode = error.response ? error.response.status : error.code || null;
      const errorMessage = error.message || "Unknown error";
      console.error(`API Error Catch: POST ${url}: ${errorMessage}`);
      _mockArms_global.api({
        api: url,
        success: false,
        time: Date.now() - startTime,
        code: errorCode,
        msg: errorMessage,
        traceId: traceId,
        domain: this.config.public.siteUrl.replace(/\/$/, "").replace(/(https:\/\/)|(http:\/\/)/, "")
      });
      throw error;
    }
  }
  async search({
    query = "miku"
  }) {
    console.log(`Searching for character with keyword: ${query}`);
    return this.get("/s/w/search/character", {
      keyword: query
    });
  }
  async detail({
    id
  }) {
    console.log(`Workspaceing detail for character ID: ${id}`);
    const characterId = id;
    const characterDetailParams = {
      characterId: characterId
    };
    const characterDetail = await this.get("/s/w/character/detail", characterDetailParams);
    console.log("Character detail fetched successfully.");
    console.log("Requesting chat session...");
    const chatGetData = {
      characterId: characterId
    };
    const chatGetResult = await this.post("/s/w/chat/get", chatGetData);
    console.log("Chat session established.");
    this.dialogueId = chatGetResult.dialogueId;
    if (chatGetResult.openingRemark && chatGetResult.openingRemark.mid) {
      this.lastAiMessageMid = chatGetResult.openingRemark.mid;
      console.log(`Initial AI message MID: ${this.lastAiMessageMid}`);
    } else {
      console.log("No initial AI message MID found.");
    }
    return {
      ...characterDetail,
      ...chatGetResult
    };
  }
  async dialogue({
    id
  }) {
    console.log(`Workspaceing dialogue messages for dialogue ID: ${id}`);
    return this.get("/s/w/dialogues/messages", {
      dialogueId: id
    });
  }
  async chat({
    prompt,
    char_id = "ac_zzRamrTzTWMc1ftU1ysY"
  }) {
    console.log(`Initiating chat for character: ${char_id}, prompt: "${prompt}"`);
    if (!this.dialogueId) {
      console.log("No dialogueId found, fetching character details to establish one.");
      try {
        await this.detail({
          id: char_id
        });
        if (!this.dialogueId) {
          throw new Error("Failed to obtain dialogueId for chat after detail fetch.");
        }
      } catch (error) {
        console.error("Failed to get dialogueId:", error.message);
        throw error;
      }
    }
    try {
      await this.ensureWebSocketConnected();
      console.log("WebSocket connection confirmed/established.");
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error.message);
      throw new Error(`Failed to establish WebSocket connection before chat: ${error.message}`);
    }
    const currentTs = Date.now();
    const requestIdUserSendMessage = generateRandomString(32);
    const messageData = {
      message: prompt,
      dialogueId: this.dialogueId
    };
    const userSendMessage = {
      requestId: requestIdUserSendMessage,
      event: "user_send_message",
      data: JSON.stringify(messageData),
      ts: currentTs
    };
    console.log("Sending user_send_message via WebSocket.");
    this.sendWebSocketMessage(userSendMessage);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.unsubscribeWebSocket(callbackId);
        console.error("Timeout waiting for AI response.");
        reject(new Error("Timeout waiting for AI response."));
      }, 15e3);
      const callbackId = this.subscribeWebSocket(message => {
        if (message.event === "server_receive_message") {
          console.log("Received server_receive_message.");
          try {
            this.lastUserMessageMid = JSON.parse(message.data).mid;
            console.log(`lastUserMessageMid set to: ${this.lastUserMessageMid}`);
          } catch (e) {
            console.error("Error parsing server_receive_message data:", e);
          }
        } else if (message.event === "server_push_message") {
          console.log("Received server_push_message. Resolving chat.");
          clearTimeout(timeout);
          let aiResponse = null;
          let parsedData = null;
          try {
            parsedData = JSON.parse(message.data);
            console.log("Parsed server_push_message data:", parsedData);
            aiResponse = parsedData.messages?.filter(m => m.type === 200)?.pop();
          } catch (e) {
            console.error("Error parsing server_push_message data:", e);
          }
          if (aiResponse) {
            this.lastAiMessageMid = aiResponse.mid;
            console.log(`AI Response MID: ${this.lastAiMessageMid}, Data: ${aiResponse.data}`);
            resolve({
              text: aiResponse.data,
              ...parsedData
            });
            const requestIdUserMessageReportAi = generateRandomString(32);
            const reportDataAi = {
              mid: this.lastAiMessageMid,
              dialogueId: this.dialogueId
            };
            const userMessageReportAi = {
              requestId: requestIdUserMessageReportAi,
              event: "user_message_report",
              data: JSON.stringify(reportDataAi),
              ts: Date.now()
            };
            console.log("Sending user_message_report for AI response.");
            this.sendWebSocketMessage(userMessageReportAi);
          } else {
            console.log("No AI response found in server_push_message.");
            resolve("No response received from AI.");
          }
          this.unsubscribeWebSocket(callbackId);
        }
      });
    });
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
  const client = new GoHIAAIAPI();
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
    console.error("Handler error:", error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  } finally {
    console.log("\n--- Main Execution Finished ---");
    client.closeWebSocket();
    console.log("WebSocket connection closure sequence initiated.");
  }
}