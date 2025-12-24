import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class AudioXClient {
  constructor(userId) {
    this.userId = userId || uuidv4();
    this.sessionToken = null;
    this.mailAPI = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.supabaseAuth = "https://jkdptytqsihuiawmeqsw.supabase.co/auth/v1";
    this.supabaseRest = "https://jkdptytqsihuiawmeqsw.supabase.co/rest/v1";
    this.audioxAPI = "https://audiox.app/api";
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZHB0eXRxc2lodWlhd21lcXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxMjA2NjQsImV4cCI6MjA1NTY5NjY2NH0.Vpn_6_SSKPP7vKu6mHsGEtvNjV8tIvmZpg5wKRss-A0";
    this.client = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    console.log(`User ID: ${this.userId}`);
  }
  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    const prefix = type === "error" ? "ERROR" : "INFO";
    console.log(`[${time}] [${prefix}] ${msg}`);
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
  async getEmail() {
    try {
      this.log("Getting temp email...");
      const {
        data
      } = await this.client.get(`${this.mailAPI}?action=create`, {
        headers: {
          origin: "https://audiox.app",
          referer: "https://audiox.app/"
        }
      });
      this.log(`Email: ${data.email}`);
      return data.email;
    } catch (error) {
      this.log(`Failed to get email: ${error.message}`, "error");
      throw error;
    }
  }
  async requestOTP(email) {
    try {
      this.log(`Requesting OTP for: ${email}`);
      await this.client.post(`${this.supabaseAuth}/otp?redirect_to=https%3A%2F%2Faudiox.app`, {
        email: email,
        data: {},
        create_user: true
      }, {
        headers: {
          apikey: this.apiKey,
          "content-type": "application/json;charset=UTF-8",
          origin: "https://audiox.app",
          referer: "https://audiox.app/",
          "sec-fetch-site": "cross-site",
          "x-client-info": "@supabase/auth-helpers-nextjs@0.7.2"
        }
      });
      this.log("OTP requested successfully");
    } catch (error) {
      this.log(`Failed to request OTP: ${error.message}`, "error");
      throw error;
    }
  }
  async getVerifyLink(email, attempts = 10) {
    this.log("Waiting for verification link...");
    for (let i = 0; i < attempts; i++) {
      try {
        const {
          data
        } = await this.client.get(`${this.mailAPI}?action=message&email=${email}`, {
          headers: {
            origin: "https://audiox.app",
            referer: "https://audiox.app/"
          }
        });
        if (data?.data?.length > 0) {
          const text = data.data[0].text_content;
          const match = text.match(/\[(https:\/\/jkdptytqsihuiawmeqsw\.supabase\.co\/auth\/v1\/verify\?[^\]]+)\]/);
          if (match?.[1]) {
            this.log("Verification link found!");
            return match[1];
          }
        }
      } catch (error) {
        this.log(`Attempt ${i + 1} failed: ${error.message}`, "error");
      }
      this.log(`Attempt ${i + 1}/${attempts}: Verification link not found yet. Retrying in 5 seconds...`);
      await new Promise(r => setTimeout(r, 5e3));
    }
    throw new Error("Verification link not found after all attempts");
  }
  async verify(url) {
    try {
      this.log(`Following verification link: ${url}`);
      const response = await this.client.get(url, {
        headers: {
          origin: "https://audiox.app",
          referer: "https://audiox.app/",
          "sec-fetch-site": "cross-site",
          "x-client-info": "@supabase/auth-helpers-nextjs@0.7.2"
        },
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      const location = response.headers.location;
      if (location) {
        const params = new URLSearchParams(new URL(location).hash.substring(1));
        this.sessionToken = params.get("access_token");
        if (this.sessionToken) {
          this.log("Verification successful and session token obtained!");
          return this.sessionToken;
        }
      }
    } catch (error) {
      if (error.response?.headers?.location) {
        const location = error.response.headers.location;
        const params = new URLSearchParams(new URL(location).hash.substring(1));
        this.sessionToken = params.get("access_token");
        if (this.sessionToken) {
          this.log("Verification successful (redirect handled) and session token obtained!");
          return this.sessionToken;
        }
      }
      this.log(`Verification failed: ${error.message}`, "error");
      throw error;
    }
    throw new Error("Failed to get session token");
  }
  async getUser() {
    if (!this.sessionToken) {
      this.log("No session token available. Please complete verification first.", "error");
      throw new Error("No session token available.");
    }
    this.log("Fetching Supabase user info...");
    try {
      const response = await this.client.get(`${this.supabaseAuth}/user`, {
        headers: {
          apikey: this.apiKey,
          authorization: `Bearer ${this.sessionToken}`,
          origin: "https://audiox.app",
          referer: "https://audiox.app/",
          "sec-fetch-site": "cross-site",
          "x-client-info": "@supabase/auth-helpers-nextjs@0.7.2"
        }
      });
      this.log("Supabase user info received.");
      this.log(`User ID: ${response.data.id}, Email: ${response.data.email}`);
      this.userId = response.data.id;
      return response.data;
    } catch (error) {
      this.log("Failed to get Supabase user info.", "error");
      throw error;
    }
  }
  async dailyLogin() {
    try {
      if (!this.sessionToken) {
        this.log("No session token available for daily login. Please complete verification first.", "error");
        throw new Error("No session token available.");
      }
      this.log("Attempting daily login...");
      const {
        data
      } = await this.client.post(`${this.audioxAPI}/points/daily-login`, {
        userId: this.userId,
        singleRowOnly: true
      }, {
        headers: {
          "content-type": "application/json",
          origin: "https://audiox.app",
          referer: "https://audiox.app/",
          "x-app-auth": "api-secret-audiox-2025"
        }
      });
      this.log("Daily login successful");
      return data;
    } catch (error) {
      this.log(`Daily login failed: ${error.message}`, "error");
      throw error;
    }
  }
  async init() {
    try {
      this.log("Starting authentication and daily login flow...");
      const email = await this.getEmail();
      await this.requestOTP(email);
      const link = await this.getVerifyLink(email);
      await this.verify(link);
      console.log(`[INFO] Session Token: ${this.sessionToken}`);
      const user = await this.getUser();
      console.log(`[INFO] Supabase User: ${JSON.stringify(user, null, 2)}`);
      const dailyLoginResponse = await this.dailyLogin();
      console.log(`[INFO] Daily Login Response: ${JSON.stringify(dailyLoginResponse, null, 2)}`);
      this.log("Authentication and daily login flow completed successfully.");
      return this;
    } catch (error) {
      this.log(`Authentication failed: ${error.message}`, "error");
      throw error;
    }
  }
  async create({
    action,
    ...rest
  }) {
    try {
      let endpoint, data, headers = {};
      let requestMethod = "post";
      this.log(`Initiating request for type: ${action}`);
      if (rest.prompt) this.log(`Prompt: "${rest.prompt}"`);
      switch (action) {
        case "text-to-music":
        case "sound-effects":
        case "text-to-speech":
        case "text-to-audio":
        case "rewrite-mmaudio":
          endpoint = `${this.audioxAPI}/${action}`;
          data = {
            userId: this.userId,
            prompt: rest.prompt || `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
            negativePrompt: rest.negativePrompt || "",
            duration: rest.duration || "15",
            voice: rest.voice || "jm_kumo",
            responseFormat: rest.responseFormat || "mp3",
            speed: rest.speed || "1.3",
            ...rest
          };
          headers = {
            "content-type": "application/json",
            origin: "https://audiox.app",
            referer: `https://audiox.app/${action === "text-to-speech" ? "lyria2" : action}`,
            "x-app-auth": "api-secret-audiox-2025",
            "x-points-checked": "true"
          };
          break;
        case "get-user-audios":
          requestMethod = "get";
          let currentUserId = this.userId;
          let currentSessionToken = this.sessionToken;
          if (rest.encryptedAuthInfo) {
            try {
              const decryptedAuth = await this.dec(rest.encryptedAuthInfo);
              if (decryptedAuth.userId && decryptedAuth.sessionToken) {
                currentUserId = decryptedAuth.userId;
                currentSessionToken = decryptedAuth.sessionToken;
                this.log("Using provided encrypted auth info for getUserAudios.");
              } else {
                throw new Error("Decrypted auth info missing userId or sessionToken.");
              }
            } catch (decryptError) {
              this.log(`Failed to decrypt auth info: ${decryptError.message}`, "error");
              throw new Error("Invalid encrypted authentication information provided.");
            }
          } else {
            if (!currentSessionToken || !currentUserId) {
              this.log("Authentication required to fetch user audios (no encrypted info provided).", "error");
              throw new Error("Authentication required to fetch user audios.");
            }
          }
          const hoursAgo = rest.hoursAgo || 24;
          const now = new Date();
          const pastDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1e3);
          const created_at_gte = pastDate.toISOString();
          const queryParams = new URLSearchParams({
            select: "*",
            user_id: `eq.${currentUserId}`,
            created_at: `gte.${created_at_gte}`,
            order: "created_at.desc"
          });
          endpoint = `${this.supabaseRest}/user_audios?${queryParams}`;
          headers = {
            "accept-profile": "public",
            apikey: this.apiKey,
            authorization: `Bearer ${currentSessionToken}`,
            origin: "https://audiox.app",
            referer: "https://audiox.app/",
            "sec-fetch-site": "cross-site",
            "x-client-info": "@supabase/auth-helpers-nextjs@0.7.2"
          };
          data = null;
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      this.log(`Sending ${requestMethod.toUpperCase()} request to: ${endpoint}`);
      if (data) this.log(`Request payload: ${JSON.stringify(data)}`);
      this.log(`Request headers: ${JSON.stringify(headers)}`);
      let response;
      if (requestMethod === "post") {
        response = await this.client.post(endpoint, data, {
          headers: headers
        });
      } else {
        response = await this.client.get(endpoint, {
          headers: headers
        });
      }
      this.log(`Request successful for type: ${action}`);
      this.log(`Response status: ${response.status}`);
      this.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);
      const task_id = await this.enc(response.data);
      this.log(`Task created with ID (or data encrypted): ${task_id.substring(0, 20)}...`);
      return {
        task_id: task_id,
        raw_data: response.data
      };
    } catch (error) {
      this.log(`Create ${action} failed: ${error.message}`, "error");
      if (error.response) {
        this.log(`Error Status: ${error.response.status}`, "error");
        this.log(`Error Data: ${JSON.stringify(error.response.data)}`, "error");
        this.log(`Error Headers: ${JSON.stringify(error.response.headers)}`, "error");
      }
      throw error;
    }
  }
  async status({
    task_id
  }) {
    try {
      this.log(`Checking status for task: ${task_id.substring(0, 20)}...`);
      const decryptedData = await this.dec(task_id);
      this.log("Task status retrieved successfully");
      return {
        task_id: task_id,
        status: "completed",
        data: decryptedData
      };
    } catch (error) {
      this.log(`Status check failed: ${error.message}`, "error");
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
        action: "text-to-music | sound-effects | text-to-speech | text-to-audio | rewrite-mmaudio | get-user-audios"
      }
    });
  }
  let client;
  try {
    client = new AudioXClient();
    await client.init();
    console.log("[API] AudioXClient initialized and authenticated.");
    let result;
    switch (action) {
      case "text-to-music":
      case "sound-effects":
      case "text-to-audio":
      case "rewrite-mmaudio":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        if (action !== "rewrite-mmaudio" && !params.duration) {
          return res.status(400).json({
            error: `Missing required field: duration (required for ${action})`
          });
        }
        result = await client.create({
          action: action,
          ...params
        });
        break;
      case "text-to-speech":
        if (!params.prompt || !params.voice || !params.responseFormat) {
          return res.status(400).json({
            error: `Missing required fields: prompt, voice, responseFormat (required for ${action})`
          });
        }
        result = await client.create({
          action: action,
          ...params
        });
        break;
      case "get-user-audios":
        result = await client.create({
          action: action,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: text-to-music | sound-effects | text-to-speech | text-to-audio | rewrite-mmaudio | get-user-audios`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[API ERROR] Processing error for action ${action}:`, error.message);
    return res.status(500).json({
      error: `Processing error: ${error.message}`,
      details: error.response?.data || null
    });
  }
}