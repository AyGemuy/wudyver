import axios from "axios";
import {
  randomBytes
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class SpeechifyAPI {
  constructor() {
    this.tokenURL = "https://voiceover-demo-server--us-central1-5hlswwmzra-uc.a.run.app/token";
    this.createAudioURL = "https://api.sws.speechify.com/experimental/audio/stream";
    this.listVoicesURL = "https://cdn.speechify.com/voiceover-demo/voices.json";
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.defaultVoiceId = "oliver";
    this.defaultModel = "simba-english";
    this.defaultLanguage = "en-US";
    this.defaultEmotion = "bright";
  }
  _randomSpoofIP() {
    const bytes = randomBytes(4);
    return Array.from(bytes).map(b => b % 255 + 1).join(".");
  }
  _randomID(length = 8) {
    return randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }
  _buildSpoofHeaders(targetSite = "speechify.com", contentType = "application/json", extra = {}) {
    const ip = this._randomSpoofIP();
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: `https://${targetSite}`,
      priority: "u=1, i",
      referer: `https://${targetSite}/`,
      "sec-ch-ua": `"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": targetSite === "speechify.com" ? "same-site" : "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-request-id": this._randomID(8),
      "content-type": contentType,
      ...SpoofHead(),
      ...extra
    };
    if (this.accessToken) {
      headers["authorization"] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }
  async _parseJsonResponse(response) {
    if (!response || !response.data) {
      throw new Error("No response data to parse.");
    }
    try {
      return JSON.parse(response.data);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON: ${parseError.message}. Response data: ${response.data.toString().substring(0, 200)}...`);
    }
  }
  async _getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    const headers = this._buildSpoofHeaders("speechify.com", "*/*");
    try {
      const response = await axios.get(this.tokenURL, {
        headers: headers,
        responseType: "text"
      });
      const data = await this._parseJsonResponse(response);
      if (data && data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + data.expires_in * 1e3 - 6e4;
        return this.accessToken;
      } else {
        throw new Error("Failed to get access token: Invalid response structure.");
      }
    } catch (error) {
      console.error("Error getting access token:", error.message);
      throw error;
    }
  }
  async create({
    text: input,
    voice: voice_id = this.defaultVoiceId,
    model = this.defaultModel,
    language = this.defaultLanguage,
    emotion = this.defaultEmotion,
    ...rest
  }) {
    try {
      const token = await this._getAccessToken();
      const processedInput = `<speak><speechify:emotion emotion="${emotion}">${input}</speechify:emotion></speak>`;
      const payload = {
        input: processedInput,
        voice_id: voice_id,
        model: model,
        language: language,
        ...rest
      };
      const headers = this._buildSpoofHeaders("speechify.com", "text/plain;charset=UTF-8", {
        accept: "audio/mpeg"
      });
      const response = await axios.post(this.createAudioURL, payload, {
        headers: headers,
        responseType: "text"
      });
      const data = await this._parseJsonResponse(response);
      if (response.status === 200 && data) {
        return data;
      } else {
        throw new Error(`Failed to create audio: Status ${response.status}, ${response.data.toString()}`);
      }
    } catch (error) {
      console.error("Error creating audio:", error.message);
      throw error;
    }
  }
  async list() {
    const headers = this._buildSpoofHeaders("speechify.com", "*/*");
    try {
      const response = await axios.get(this.listVoicesURL, {
        headers: headers,
        responseType: "text"
      });
      const data = await this._parseJsonResponse(response);
      if (response.status === 200 && data) {
        return data;
      } else {
        throw new Error(`Failed to get voice list: Status ${response.status}, ${response.data}`);
      }
    } catch (error) {
      console.error("Error getting voice list:", error.message);
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
        action: "list | create"
      }
    });
  }
  const mic = new SpeechifyAPI();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action](params);
        break;
      case "create":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: list | create`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}