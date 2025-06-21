import axios from "axios";
import CryptoJS from "crypto-js";
import apiConfig from "@/configs/apiConfig";
class RunnerAI {
  constructor() {
    this.apiUrl = "https://xfpeslqxrhptqnahqtrh.supabase.co";
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcGVzbHF4cmhwdHFuYWhxdHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NjgxMDYsImV4cCI6MjA2MDM0NDEwNn0.Eyu9ImvpEeyf0zkGDufLGLwOgLULR9Iw1uUlBUkWl7s";
    this.tempMail = `https://${apiConfig.DOMAIN_URL}`;
    this.accessToken = null;
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        apikey: this.apiKey,
        authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        accept: "*/*",
        "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
        "x-supabase-api-version": "2024-01-01"
      }
    });
    this.runnerAxios = axios.create({
      baseURL: "https://h-runner-2-server.fly.dev",
      headers: this.buildHeaders()
    });
    this.axiosInstance.interceptors.response.use(response => response, error => Promise.reject(error));
    this.runnerAxios.interceptors.request.use(config => {
      config.headers = {
        ...config.headers,
        ...this.buildHeaders()
      };
      return config;
    }, error => Promise.reject(error));
  }
  buildHeaders() {
    return {
      Accept: "application/json",
      "Accept-Language": "id-ID,id;q=0.9",
      Authorization: `Bearer ${this.accessToken}`,
      "Cache-Control": "no-cache",
      Origin: "https://runner.hcompany.ai",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://runner.hcompany.ai/",
      "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  _randStr(len) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let res = "";
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }
  _genVerifier() {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64url);
  }
  async _genChallenge(verifier) {
    return CryptoJS.SHA256(verifier).toString(CryptoJS.enc.Base64url);
  }
  async _genTempMail() {
    try {
      console.log("Fetching temporary email...");
      const res = await axios.get(`${this.tempMail}/api/mails/v9?action=create`);
      const {
        email,
        uuid
      } = res.data;
      if (!email || !uuid) throw new Error("Invalid temporary email API response.");
      console.log(`Temporary email created: ${email}`);
      return {
        email: email,
        password: uuid
      };
    } catch (err) {
      console.error("Failed to get temporary email:", err.response?.data || err.message);
      throw new Error("Failed to get temporary email from external service.");
    }
  }
  async _pollVerify(email, timeout = 12e4, interval = 3e3) {
    const start = Date.now();
    const mailApiUrl = `${this.tempMail}/api/mails/v9?action=message&email=${encodeURIComponent(email)}`;
    console.log(`Polling for verification link in ${email}...`);
    while (Date.now() - start < timeout) {
      try {
        const res = await axios.get(mailApiUrl);
        const msgs = res.data?.data;
        if (msgs?.length > 0) {
          for (const msg of msgs) {
            const match = msg.text_content?.match(/\[(https:\/\/[^\]]+\/auth\/v1\/verify\?[^\]]+)\]/);
            if (match?.[1]) {
              console.log("Verification link found.");
              return match[1];
            }
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve email, retrying:", err.message);
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error("Timeout: Verification link not found.");
  }
  async _followVerify(link) {
    try {
      console.log("Following verification link...");
      const res = await axios.get(link, {
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      if (res.headers.location) {
        console.log("Redirected to:", res.headers.location);
        try {
          await axios.get(res.headers.location);
          console.log("Final redirect successful.");
        } catch (err) {
          console.warn("Failed to follow final redirect (might already be verified).");
        }
      } else {
        console.log("Verification successful, no direct redirect detected.");
      }
      return res.data;
    } catch (err) {
      console.error("Failed to follow verification link:", err.response?.data || err.message);
      throw new Error("Failed to verify email.");
    }
  }
  async auth(redir = "https://runner.hcompany.ai/auth/login") {
    if (this.accessToken) {
      console.log("User already authenticated.");
      return {
        access_token: this.accessToken
      };
    }
    const {
      email,
      password
    } = await this._genTempMail();
    console.log(`Starting authentication for ${email}...`);
    try {
      console.log("Sending Supabase signup request...");
      const verifier = this._genVerifier();
      const challenge = await this._genChallenge(verifier);
      const signupData = {
        email: email,
        password: password,
        data: {},
        gotrue_meta_security: {},
        code_challenge: challenge,
        code_challenge_method: "s256"
      };
      await this.axiosInstance.post(`/auth/v1/signup?redirect_to=${encodeURIComponent(redir)}`, signupData);
      console.log("Supabase signup successful.");
      console.log("Starting email verification process...");
      const verifyLink = await this._pollVerify(email);
      await this._followVerify(verifyLink);
      console.log("Email verification completed.");
      console.log("Starting Supabase login process...");
      const loginData = {
        email: email,
        password: password,
        gotrue_meta_security: {}
      };
      const loginRes = await this.axiosInstance.post("/auth/v1/token?grant_type=password", loginData);
      console.log("Supabase login successful.");
      this.accessToken = loginRes.data.access_token;
      return loginRes.data;
    } catch (err) {
      console.error("Error during Supabase authentication:", err.message);
      throw err;
    }
  }
  async _ensureAuth() {
    if (!this.accessToken) {
      console.log("Access token not found, starting automatic authentication...");
      const authRes = await this.auth();
      this.accessToken = authRes.access_token;
      console.log("Authentication successful, access token obtained.");
    }
  }
  async _pollChat(id, timeout = 12e4, interval = 3e3) {
    const start = Date.now();
    console.log(`Polling for chat completion ID: ${id}...`);
    while (Date.now() - start < timeout) {
      try {
        const res = await this.runnerAxios.get(`/chat/${id}`);
        const chatData = res.data?.chat;
        const msgs = res.data?.messages;
        if (msgs?.length > 0) {
          const assistantMsg = msgs.find(m => m.type === "assistant" && m.content && m.content.length > 0 && m.timestamp);
          if (assistantMsg) {
            console.log("Assistant chat response received and complete.");
            console.log(`  Chat updated_at: ${chatData?.updated_at}`);
            console.log(`  Assistant message timestamp: ${new Date(assistantMsg.timestamp).toISOString()}`);
            return {
              fullChatData: res.data,
              assistantText: assistantMsg.content
            };
          } else {
            console.log("Assistant message incomplete or not present. Retrying...");
          }
        } else {
          console.log("Message array empty or not present. Retrying...");
        }
      } catch (err) {
        console.warn("Failed to retrieve chat details during polling, retrying:", err.message);
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error("Timeout: Assistant chat response not completed.");
  }
  async chat({
    prompt,
    ...rest
  }) {
    await this._ensureAuth();
    console.log("Sending message to Chat API...");
    let chatResData = {};
    let chatId = null;
    let assistantResponseText = null;
    try {
      const payload = {
        message: prompt,
        moderation_level: rest.moderation_level || "moderate",
        timezone: rest.timezone || "Asia/Makassar",
        file_ids: rest.file_ids || [],
        mentioned_tool_ids: rest.mentioned_tool_ids || [],
        ...rest
      };
      const res = await this.runnerAxios.post("/chat", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("POST response from Chat API received.");
      chatResData = res.data;
      chatId = chatResData.chat_id;
      if (chatId) {
        const pollRes = await this._pollChat(chatId);
        chatResData = pollRes.fullChatData;
        assistantResponseText = pollRes.assistantText;
      } else {
        console.warn("Chat ID not found from initial POST response, cannot poll.");
      }
    } catch (err) {
      console.error("Error interacting with Chat API:", err.response?.data || err.message);
      throw err;
    }
    const finalResult = {
      chatResponse: chatResData,
      assistantResponseText: assistantResponseText,
      runsQuota: null,
      allChats: null,
      fileRootData: null
    };
    try {
      console.log("Fetching user runs quota...");
      finalResult.runsQuota = (await this.runnerAxios.get("/user/runs-quota"))?.data;
      console.log("User runs quota data received.");
    } catch (err) {
      console.error("Error fetching user runs quota:", err.response?.data || err.message);
    }
    try {
      console.log("Fetching all chat conversations...");
      finalResult.allChats = (await this.runnerAxios.get("/chat/chats"))?.data;
      console.log("All chat conversations data received.");
    } catch (err) {
      console.error("Error fetching all chat conversations:", err.response?.data || err.message);
    }
    try {
      console.log("Fetching file root data...");
      finalResult.fileRootData = (await this.runnerAxios.get("/file/root"))?.data;
      console.log("File root data received.");
    } catch (err) {
      console.error("Error fetching file root data:", err.response?.data || err.message);
    }
    return finalResult;
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
    const authService = new RunnerAI();
    const response = await authService.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}