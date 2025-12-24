import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class Chat4oClient {
  constructor(options = {}) {
    this.mailApiUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.chat4oBaseUrl = "https://chat4o.ai";
    this.tap4aiApiUrl = "https://api2.tap4.ai";
    this.defaultLang = "id-ID";
    this.defaultUA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.origin = "https://chat4o.ai";
    this.referer = "https://chat4o.ai/";
    this.email = options.email || null;
    this.password = options.password || this.genRandPass(12);
    this.userName = options.userName || `user_${this.genUUID().substring(0, 8)}`;
    this.otp = null;
    this.bearerToken = null;
    this.sessionId = null;
    this.currentModel = null;
    console.log(`LOG: Init Chat4oClient with spoofed`);
    this.axiosInstance = axios.create({
      headers: {
        "accept-language": this.defaultLang,
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "user-agent": this.defaultUA,
        origin: this.origin,
        referer: this.referer,
        ...SpoofHead()
      }
    });
    console.log("LOG: Axios instance created.");
    this.axiosInstance.interceptors.request.use(config => {
      if (this.bearerToken) {
        config.headers.Authorization = `Bearer ${this.bearerToken}`;
        console.log(`LOG: Interceptor: Adding Bearer token to ${config.url}`);
      }
      return config;
    }, error => {
      console.error("ERROR: Interceptor caught req error:", error.message);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      console.log(`LOG: Interceptor: Received resp from ${response.config.url} status ${response.status}`);
      return response;
    }, error => {
      console.error(`ERROR: Interceptor caught resp error from ${error.config ? error.config.url : "unknown"} :`, error.message);
      return Promise.reject(error);
    });
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  genUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  genRandPass(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async createEmail() {
    try {
      console.log("LOG: Creating temp email...");
      const resp = await axios.get(`${this.mailApiUrl}?action=create`);
      const data = resp.data;
      if (!data || !data.email) {
        throw new Error(`Failed to create email: No email. Resp: ${JSON.stringify(data)}`);
      }
      this.email = data.email;
      console.log(`LOG: Temp email created: ${this.email}`);
      return this.email;
    } catch (error) {
      console.error(`ERROR: Failed to create email: ${error.message}`);
      throw error;
    }
  }
  async checkOTP(maxRetries = 60, delay = 3e3) {
    console.log("LOG: Starting OTP check...");
    for (let i = 0; i < maxRetries; i++) {
      console.log(`LOG: Attempt ${i + 1}/${maxRetries} for OTP for ${this.email}`);
      try {
        const resp = await axios.get(`${this.mailApiUrl}?action=message&email=${this.email}`);
        const data = resp.data;
        if (data && data.data && data.data.length > 0) {
          const textContent = data.data[0].text_content;
          const otpMatch = textContent.match(/Security code: (\d+)/);
          if (otpMatch) {
            this.otp = otpMatch[1];
            console.log(`LOG: OTP received: ${this.otp}`);
            return this.otp;
          }
        }
        console.log("LOG: OTP not yet avail, retrying...");
      } catch (error) {
        console.warn(`WARN: OTP check attempt ${i + 1} failed: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Failed to retrieve OTP after max retries");
  }
  async _regLogin() {
    console.log("LOG: Starting full reg/login flow...");
    try {
      if (!this.email) {
        console.log("LOG: Email not set, creating...");
        await this.createEmail();
      }
      console.log(`LOG: Sending reg req (step 1 - email: ${this.email}, user: ${this.userName}, pass: ${this.password})...`);
      await this.axiosInstance.post(`${this.chat4oBaseUrl}/ai/text-to-video/`, JSON.stringify([{
        email: this.email,
        userName: this.userName,
        password: this.password
      }]), {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "4091f8c5b7f14a63ebc07a0a5b64238eb6da668db5",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(without-footer)%22%2C%7B%22children%22%3A%5B%22ai%22%2C%7B%22children%22%3A%5B%22text-to-video%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fai%2Ftext-to-video%2F%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("LOG: Reg step 1 req sent. Waiting for OTP...");
      this.otp = await this.checkOTP();
      if (!this.otp) {
        throw new Error("OTP not received, cannot proceed.");
      }
      console.log(`LOG: OTP ${this.otp} obtained.`);
      console.log("LOG: Sending reg req (step 2 - verify email code)...");
      await this.axiosInstance.post(`${this.chat4oBaseUrl}/ai/text-to-video/`, JSON.stringify([{
        email: this.email,
        emailCode: this.otp
      }]), {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "40b45bbd7a6b6f6ce220625d637064d85577b53363",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(without-footer)%22%2C%7B%22children%22%3A%5B%22ai%22%2C%7B%22children%22%3A%5B%22text-to-video%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fai%2Ftext-to-video%2F%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7B%5D",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("LOG: Reg step 2 (email verify) req sent.");
      console.log("LOG: Attempting final login for bearer token...");
      const loginResp = await this.axiosInstance.post(`${this.chat4oBaseUrl}/ai/text-to-video/`, JSON.stringify([{
        email: this.email,
        password: this.password
      }]), {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "400d6d9374638036266c8896835ab63a3e1e750ba0",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(without-footer)%22%2C%7B%22children%22%3A%5B%22ai%22%2C%7B%22children%22%3A%5B%22text-to-video%22%2C%7B%7D%2C%22%2Fai%2Ftext-to-video%2F%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("LOG: Login req sent. Checking Set-Cookie for Auth token...");
      const setCookieHeader = loginResp.headers["set-cookie"];
      let authCookieValue = null;
      const cookiePrefix = "Authorization=";
      const cookieSeparator = ";";
      if (setCookieHeader) {
        const cookieHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        console.log(`LOG: Found ${cookieHeaders.length} Set-Cookie headers. Searching Auth cookie.`);
        for (const cookieString of cookieHeaders) {
          const startIndex = cookieString.indexOf(cookiePrefix);
          if (startIndex !== -1) {
            const valueStartIndex = startIndex + cookiePrefix.length;
            const endIndex = cookieString.indexOf(cookieSeparator, valueStartIndex);
            let tokenEncoded;
            if (endIndex !== -1) {
              tokenEncoded = cookieString.substring(valueStartIndex, endIndex);
            } else {
              tokenEncoded = cookieString.substring(valueStartIndex);
            }
            authCookieValue = decodeURIComponent(tokenEncoded);
            console.log(`LOG: Auth cookie found: ${authCookieValue}`);
            break;
          }
        }
      }
      if (authCookieValue) {
        this.bearerToken = authCookieValue;
        console.log("LOG: Bearer token extracted and set.");
        return true;
      } else {
        console.error("ERROR: Auth cookie not found in Set-Cookie.");
        throw new Error("Auth cookie not found after login.");
      }
    } catch (error) {
      console.error(`ERROR: Full reg/login flow failed: ${error.message}`);
      throw error;
    }
  }
  async ensureAuth() {
    if (!this.bearerToken) {
      console.log("INFO: Client not auth. Initiating auth...");
      await this._regLogin();
      console.log("INFO: Auth completed.");
    } else {
      console.log("INFO: Client already auth. Skipping.");
    }
  }
  async ensureChatSess(firstContent = "Hello", llmModelName = "o4-mini") {
    await this.ensureAuth();
    if (this.sessionId && this.currentModel && this.currentModel !== llmModelName) {
      console.log(`INFO: Model changed from ${this.currentModel} to ${llmModelName}. Resetting session.`);
      this.sessionId = null;
    }
    if (!this.sessionId) {
      console.log(`INFO: No active chat sess or model changed. Creating new one with model: ${llmModelName}...`);
      const sessData = await this._addChatSess({
        firstContent: firstContent,
        llmModelName: llmModelName
      });
      this.sessionId = sessData.sessionId;
      this.currentModel = llmModelName;
      console.log(`INFO: New chat sess created: ${this.sessionId} with model: ${this.currentModel}`);
    } else {
      console.log(`INFO: Reusing existing chat sess: ${this.sessionId} with model: ${this.currentModel}`);
    }
  }
  async _addChatSess({
    firstContent,
    llmModelName = "o4-mini",
    chatLogNum = "6",
    site = "chat4o.ai"
  }) {
    try {
      console.log(`LOG: Adding chat sess with first content: "${firstContent}" model: ${llmModelName}...`);
      const resp = await this.axiosInstance.post(`${this.tap4aiApiUrl}/chatbotSession/addV3`, {
        site: site,
        firstContent: firstContent,
        chatLogNum: chatLogNum,
        llmModelName: llmModelName
      }, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          credentials: "include",
          "content-language": "en",
          "sec-fetch-site": "cross-site"
        }
      });
      const data = resp.data;
      if (data.code !== 200 || !data.data || !data.data.sessionId) {
        throw new Error(`Failed to add chat sess: ${data.msg || "Unknown error"}. Resp: ${JSON.stringify(data)}`);
      }
      console.log(`LOG: Chat sess added. Session ID: ${data.data.sessionId}`);
      return data.data;
    } catch (error) {
      console.error(`ERROR: Failed to add chat sess: ${error.message}`);
      throw error;
    }
  }
  parseData(dataString) {
    let combinedContent = "";
    dataString.split("\n").forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("data:")) {
        try {
          const parsedData = JSON.parse(trimmedLine.slice(5));
          if (parsedData?.data?.content) {
            combinedContent += parsedData.data.content;
          }
        } catch (e) {}
      }
    });
    return {
      result: combinedContent
    };
  }
  async chat({
    prompt: content,
    modelGrade = "pro",
    llmModelName = "o4-mini",
    chatLogNum = "6",
    site = "chat4o.ai"
  }) {
    await this.ensureChatSess(content, llmModelName);
    if (!this.sessionId) {
      throw new Error("Failed to establish chat sess.");
    }
    const userMsgTempId = `${this.genUUID()}-${this.genRandStr(15)}`;
    const assistantMsgTempId = `${this.genUUID()}-${this.genRandStr(15)}`;
    console.log(`LOG: Preparing chat stream req for sess ${this.sessionId} content: "${content}" using model: ${llmModelName}`);
    try {
      const resp = await this.axiosInstance.post(`${this.tap4aiApiUrl}/chatbotLog/chat/stream/creditV2`, {
        site: site,
        chatLogNum: chatLogNum,
        content: content,
        modelGrade: modelGrade,
        llmModelName: llmModelName,
        sessionId: this.sessionId,
        userMessageTempId: userMsgTempId,
        assistantMessageTempId: assistantMsgTempId
      }, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          credentials: "include",
          "content-language": "en",
          "sec-fetch-site": "cross-site"
        }
      });
      const data = resp.data;
      console.log("LOG: Chat stream req sent. Initial resp received.");
      return this.parseData(data);
    } catch (error) {
      console.error(`ERROR: Failed to init chat stream: ${error.message}`);
      throw error;
    }
  }
  async image({
    prompt,
    outputPrompt,
    width = 3,
    height = 2,
    modelName = "4o-image",
    platformType = 38,
    styleName = "",
    isPublic = 1,
    isTranslate = true,
    imageType = "gpt-4o-all",
    imageUrlList = [],
    site = "chat4o.ai"
  }) {
    await this.ensureAuth();
    await this.ensureChatSess("Initial session for image generation", "o4-mini");
    console.log(`LOG: Preparing image gen req with prompt: "${prompt}"...`);
    try {
      const resp = await this.axiosInstance.post(`${this.tap4aiApiUrl}/image/generator4login/async`, {
        site: site,
        prompt: prompt,
        outputPrompt: outputPrompt,
        platformType: platformType,
        modelName: modelName,
        width: width,
        height: height,
        styleName: styleName,
        isPublic: isPublic,
        isTranslate: isTranslate,
        imageType: imageType,
        imageUrlList: imageUrlList
      }, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          credentials: "include",
          "content-language": "en",
          "sec-fetch-site": "cross-site"
        }
      });
      const initialImgData = resp.data;
      if (initialImgData.code !== 200 || !initialImgData.data || !initialImgData.data.key) {
        throw new Error(`Failed to init image gen: ${initialImgData.msg || "Unknown error"}. Resp: ${JSON.stringify(initialImgData)}`);
      }
      console.log("LOG: Image gen req submitted. Initial resp with jobId:", initialImgData.data.key);
      const textToEncrypt = {
        task_id: initialImgData.data.key,
        type: "txt2img",
        sessionId: this.sessionId,
        token: this.bearerToken
      };
      const encrypted_task_id = await this.enc(textToEncrypt);
      console.log("LOG: Task ID encrypted.");
      return {
        status: true,
        task_id: encrypted_task_id
      };
    } catch (error) {
      console.error(`ERROR: Failed to init image gen: ${error.message}`);
      throw error;
    }
  }
  async status({
    task_id: encrypted_task_id
  }) {
    console.log(`LOG: Attempting to retrieve image result for encrypted task ID.`);
    let decryptedData;
    try {
      const json = await this.dec(encrypted_task_id);
      if (!json) throw new Error("Failed to decrypt task_id (empty result).");
      decryptedData = json;
      console.log("LOG: Decrypted task data:", decryptedData);
    } catch (error) {
      console.error(`ERROR: Failed to decrypt task ID: ${error.message}`);
      throw new Error(`Invalid or undecryptable task ID: ${error.message}`);
    }
    const jobId = decryptedData.task_id;
    this.bearerToken = decryptedData.token;
    this.sessionId = decryptedData.sessionId;
    try {
      const resp = await this.axiosInstance.get(`${this.tap4aiApiUrl}/image/getResult/${jobId}`, {
        headers: {
          accept: "*/*",
          credentials: "include",
          "content-language": "en",
          "sec-fetch-site": "cross-site"
        }
      });
      const data = resp.data;
      if (data.code === 200 && data.data) {
        console.log(`LOG: Image result retrieved for job ID ${jobId}. Status: ${data.data.status}`);
        return data.data;
      } else {
        throw new Error(`Image result for job ID ${jobId} not ready or error: ${data.msg || "Unknown error"}.`);
      }
    } catch (error) {
      console.error(`ERROR: Failed to retrieve image result for job ID ${jobId}: ${error.message}`);
      throw error;
    }
  }
  genRandStr(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
        action: "chat | image | status"
      }
    });
  }
  const client = new Chat4oClient();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields for 'chat': prompt`
          });
        }
        result = await client.chat(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields for 'image': prompt`
          });
        }
        result = await client.image(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field for 'status': task_id`
          });
        }
        result = await client.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions are: chat, image, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`API Error for action ${action}:`, error.message);
    return res.status(500).json({
      error: `Processing error for action '${action}': ${error.message}`
    });
  }
}