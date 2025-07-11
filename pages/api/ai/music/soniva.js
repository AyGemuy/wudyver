import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import {
  createHmac
} from "crypto";
import apiConfig from "@/configs/apiConfig";
class Soniva {
  constructor(userId = null) {
    this.SECRET_KEY = apiConfig.SONIVA_KEY;
    this.deviceId = uuidv4();
    this.userId = userId;
    this.BASE_URL = "https://api.sonivamusic.com/musicai";
    this.DOWNLOAD_BASE_URL = "https://d2m6kf0jl6dhrs.cloudfront.net";
  }
  _sign(data) {
    const hmac = createHmac("sha256", this.SECRET_KEY);
    hmac.update(data, "utf8");
    return Buffer.from(hmac.digest()).toString("base64");
  }
  _headers(messageId, requestTime, xRequestId) {
    return {
      host: "api.sonivamusic.com",
      "x-request-id": xRequestId,
      "x-device-id": this.deviceId,
      "x-request-time": requestTime,
      "x-message-id": messageId,
      platform: "android",
      "x-app-version": "1.2.6",
      "x-country": "ID",
      "accept-language": "id-ID",
      "user-agent": "SonivaMusic/1.2.6 (build:70; Android 10; Xiaomi Redmi Note 5)",
      "content-type": "application/json; charset=utf-8",
      "accept-encoding": "gzip"
    };
  }
  async reg() {
    console.log("🔄 Registering device...");
    const requestTime = String(Date.now());
    const messageId = uuidv4();
    const dataToSign = `${this.deviceId}${messageId}${requestTime}`;
    const signature = this._sign(dataToSign);
    const body = {
      device_id: this.deviceId,
      push_token: signature,
      message_id: messageId,
      AuthToken: signature
    };
    const headers = this._headers(messageId, requestTime, signature);
    try {
      const response = await axios.post(`${this.BASE_URL}/v1/register`, body, {
        headers: headers
      });
      this.userId = response.data.user_id;
      console.log(`✅ Registered! User ID: ${this.userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Registration failed:", error.response?.status);
      throw error;
    }
  }
  async gen(options = {}) {
    const targetUserId = options.userId || this.userId;
    if (!targetUserId) {
      await this.reg();
    } else {
      if (options.userId) {
        this.userId = options.userId;
      }
      console.log(`🔄 Using existing User ID: ${this.userId}`);
    }
    console.log("🎵 Generating song...");
    const requestTime = String(Date.now());
    const messageId = uuidv4();
    const dataToSign = `${this.deviceId}${messageId}${requestTime}`;
    const signature = this._sign(dataToSign);
    const {
      userId: _,
      ...bodyOptions
    } = options;
    const body = {
      mood: "Romantic,Motivational,Melancholic",
      genre: "Electro Pop",
      has_vocal: false,
      vocal_gender: "male",
      record_type: "live",
      title: "cinta",
      is_dual_song_enabled: true,
      message_id: messageId,
      ...bodyOptions
    };
    const headers = this._headers(messageId, requestTime, signature);
    try {
      const response = await axios.post(`${this.BASE_URL}/v1/users/${this.userId}/songs/lyrics`, body, {
        headers: headers
      });
      console.log("✅ Song generation started!");
      return {
        userId: this.userId,
        ...response.data
      };
    } catch (error) {
      console.error("❌ Generation failed:", error.response?.status);
      throw error;
    }
  }
  async list({
    userId,
    page = 1,
    limit = 90,
    sortAsc = false
  } = {}) {
    console.log("📋 Fetching song list...");
    const requestTime = String(Date.now());
    const messageId = uuidv4();
    const dataToSign = `${this.deviceId}${messageId}${requestTime}`;
    const signature = this._sign(dataToSign);
    const headers = this._headers(messageId, requestTime, signature);
    const targetUserId = userId || this.userId;
    try {
      const response = await axios.get(`${this.BASE_URL}/v1/users/${targetUserId}/library?page=${page}&limit=${limit}&sortAsc=${sortAsc}`, {
        headers: headers
      });
      console.log(`✅ Found ${response.data.songs?.length || 0} songs`);
      return response.data;
    } catch (error) {
      console.error("❌ List fetch failed:", error.response?.status);
      throw error;
    }
  }
  async dl({
    songPath = "0a86eceb-2722-4b47-a32b-90b893160a42.mp3"
  } = {}) {
    console.log(`⬇️ Downloading: ${songPath}`);
    const headers = {
      "icy-metadata": "1",
      "accept-encoding": "identity",
      "user-agent": "Dalvik/2.1.0 (Linux; U; Android 10; Redmi Note 5 Build/QQ3A.200805.001)",
      host: "d2m6kf0jl6dhrs.cloudfront.net",
      connection: "Keep-Alive"
    };
    try {
      const response = await axios.get(`${this.DOWNLOAD_BASE_URL}/song/${songPath}`, {
        headers: headers,
        responseType: "arraybuffer"
      });
      console.log(`✅ Downloaded ${(response.data.byteLength / 1024 / 1024).toFixed(2)} MB`);
      return response.data;
    } catch (error) {
      console.error("❌ Download failed:", error.response?.status);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    userId,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const soniva = new Soniva(userId);
  try {
    let result;
    switch (action) {
      case "gen":
        if (!params.lyrics) {
          return res.status(400).json({
            message: "No lyrics provided"
          });
        }
        result = await soniva.gen({
          userId: userId,
          ...params
        });
        break;
      case "list":
        if (!userId && !soniva.userId) {
          return res.status(400).json({
            message: "No userId provided"
          });
        }
        result = await soniva.list({
          userId: userId,
          ...params
        });
        break;
      case "dl":
        if (!params.songPath) {
          return res.status(400).json({
            message: "No songPath provided"
          });
        }
        result = await soniva.dl(params);
        break;
      default:
        return res.status(400).json({
          error: "Action tidak valid. Gunakan ?action=gen, ?action=list, atau ?action=dl"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}