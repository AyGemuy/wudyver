import axios from "axios";
import https from "https";
import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class SunoraAPI {
  constructor() {
    this.baseURL = "https://api.sunora.mavtao.com/api";
    this.xAuth = null;
    this.deviceId = this.genId();
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: true,
      keepAlive: true
    });
    this.client = axios.create({
      baseURL: this.baseURL,
      httpsAgent: this.httpsAgent,
      headers: {
        "User-Agent": "Dart/3.4 (dart:io)",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        version: "2.2.2",
        buildnumber: "105",
        platform: "android",
        ...SpoofHead()
      },
      timeout: 12e4
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
  genId() {
    return crypto.randomBytes(8).toString("hex");
  }
  traceId() {
    return uuidv4();
  }
  async ensureAuth() {
    if (!this.xAuth) {
      await this.login();
    }
  }
  async login() {
    try {
      const sentryTrace = this.traceId();
      const response = await this.client.post("/auth/login", {
        device_id: this.deviceId
      }, {
        headers: {
          "sentry-trace": sentryTrace
        }
      });
      if (response?.data?.code === 0 && response?.data?.data?.token) {
        this.xAuth = response.data.data.token;
        console.log("Login successful");
        return response.data;
      } else {
        throw new Error(`Login failed: ${response?.data?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Login error:", error?.response?.data || error.message);
      if (error.code?.includes("CERT") || error.message?.includes("certificate")) {
        console.log("Retrying with relaxed SSL...");
        this.httpsAgent = new https.Agent({
          rejectUnauthorized: false
        });
        this.client.defaults.httpsAgent = this.httpsAgent;
        return this.login();
      }
      throw error;
    }
  }
  async lyrics({
    prompt,
    ...rest
  }) {
    try {
      await this.ensureAuth();
      const sentryTrace = this.traceId();
      const response = await this.client.post("/music/generate_lyrics", {
        description: prompt,
        key_word: rest.key_word || "",
        mood: rest.mood || null,
        ...rest
      }, {
        headers: {
          "x-auth": this.xAuth,
          "sentry-trace": sentryTrace
        }
      });
      return response?.data;
    } catch (error) {
      console.error("Lyrics generation error:", error?.response?.data || error.message);
      if (error?.response?.status === 401) {
        console.log("Auth expired, re-logging in...");
        this.xAuth = null;
        await this.login();
        return this.lyrics({
          prompt: prompt,
          ...rest
        });
      }
      throw error;
    }
  }
  async generate({
    prompt,
    advanced = false,
    ...rest
  }) {
    try {
      await this.ensureAuth();
      const sentryTrace = this.traceId();
      const endpoint = advanced ? "/music/advanced_custom_generate" : "/music/custom_generate";
      const payload = advanced ? {
        description: prompt,
        title: rest.title || "",
        mood: rest.mood || "Energetic",
        key_word: rest.key_word || "",
        gender_of_vocal: rest.gender_of_vocal || null,
        music_style: rest.music_style || "Pop",
        instrumental_only: rest.instrumental_only || false,
        continue_at: rest.continue_at || null,
        continue_clip_id: rest.continue_clip_id || null,
        mv: rest.mv || null,
        ...rest
      } : {
        prompt: prompt,
        tags: rest.tags || "Acoustic",
        title: rest.title || "",
        continue_at: rest.continue_at || null,
        continue_clip_id: rest.continue_clip_id || null,
        mv: rest.mv || null,
        ...rest
      };
      const response = await this.client.post(endpoint, payload, {
        headers: {
          "x-auth": this.xAuth,
          "sentry-trace": sentryTrace
        }
      });
      const task_id = await this.enc({
        res_data: response?.data,
        x_auth: this.xAuth,
        sentry_trace: sentryTrace
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("Music generation error:", error?.response?.data || error.message);
      if (error?.response?.status === 401) {
        console.log("Auth expired, re-logging in...");
        this.xAuth = null;
        await this.login();
        return this.generate({
          prompt: prompt,
          advanced: advanced,
          ...rest
        });
      }
      throw error;
    }
  }
  async status({
    task_id,
    page = 1,
    pagesize = 50,
    ...rest
  }) {
    try {
      if (!task_id) {
        throw new Error("task_id is required to check status.");
      }
      const decryptedData = await this.dec(task_id);
      const {
        res_data,
        x_auth,
        sentry_trace
      } = decryptedData;
      if (!res_data || !x_auth || !sentry_trace) {
        throw new Error("Invalid task_id: Missing required data after decryption.");
      }
      const authToken = x_auth || this.xAuth;
      if (!authToken) {
        await this.ensureAuth();
      }
      const finalAuthToken = x_auth || this.xAuth;
      const sentryTrace = sentry_trace || this.traceId();
      const response = await this.client.get("/music/music_page", {
        params: {
          page: page,
          pagesize: pagesize,
          ...rest
        },
        headers: {
          "x-auth": finalAuthToken,
          "sentry-trace": sentryTrace
        }
      });
      return {
        data: response?.data?.data,
        res_data: res_data?.data
      };
    } catch (error) {
      console.error("Status check error:", error?.response?.data || error.message);
      throw error;
    }
  }
  isAuthenticated() {
    return !!this.xAuth;
  }
  setAuthToken(token) {
    this.xAuth = token;
  }
  getDeviceId() {
    return this.deviceId;
  }
  getAuthToken() {
    return this.xAuth;
  }
  destroy() {
    this.httpsAgent?.destroy();
    this.xAuth = null;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (lyrics, create or status) is required."
    });
  }
  const api = new SunoraAPI();
  try {
    switch (action) {
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'lyrics' action."
          });
        }
        const lyricsResponse = await api.lyrics(params);
        return res.status(200).json(lyricsResponse);
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await api.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await api.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'lyrics', 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}