import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
class JoyPixClient {
  constructor() {
    this.baseURL = "https://api.joypix.ai";
    this.tempMailAPI = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.email = null;
    this.password = null;
    this.sessionId = this.generateSessionId();
    this.token = null;
    this.language = "en";
  }
  generateSessionId() {
    return "_" + Math.random().toString(36).slice(2, 11);
  }
  buildHeaders() {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      "joypix-language": this.language,
      "joypix-sessionid": this.sessionId,
      origin: "https://www.joypix.ai",
      priority: "u=1, i",
      referer: "https://www.joypix.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    if (this.token) {
      headers["joypix-token"] = this.token;
    }
    return headers;
  }
  async createEmail() {
    try {
      const response = await axios.get(`${this.tempMailAPI}?action=create`);
      this.email = response.data?.email;
      return this.email;
    } catch (error) {
      throw error;
    }
  }
  async sendVerificationCode() {
    try {
      if (!this.email) await this.createEmail();
      const response = await axios.post(`${this.baseURL}/v1/user/register/email`, {
        email: this.email,
        scene: "register"
      }, {
        headers: this.buildHeaders()
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async pollVerificationCode(maxAttempts = 60, interval = 3e3) {
    try {
      for (let i = 1; i <= maxAttempts; i++) {
        try {
          const response = await axios.get(`${this.tempMailAPI}?action=message&email=${encodeURIComponent(this.email)}`);
          const messages = response.data?.data || [];
          for (const msg of messages) {
            const text = msg.text_content || "";
            const codeMatch = text.match(/\b\d{6}\b/);
            if (codeMatch) {
              return codeMatch[0];
            }
          }
          await new Promise(r => setTimeout(r, interval));
        } catch (err) {
          await new Promise(r => setTimeout(r, interval));
        }
      }
      throw new Error("Verification code not found");
    } catch (error) {
      throw error;
    }
  }
  async register(password = null) {
    try {
      if (!this.email) await this.createEmail();
      this.password = password || `Pass${Math.floor(Math.random() * 1e4)}${Math.floor(Math.random() * 1e4)}`;
      await this.sendVerificationCode();
      const verificationCode = await this.pollVerificationCode();
      const response = await axios.post(`${this.baseURL}/v1/user/register`, {
        email: this.email,
        code: verificationCode,
        password: this.password,
        password2: this.password,
        inviteCode: ""
      }, {
        headers: this.buildHeaders()
      });
      if (response.data?.data?.loginToken) {
        this.token = response.data.data.loginToken;
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async getCreditOverview() {
    try {
      if (!this.token) {
        throw new Error("Not authenticated");
      }
      const headers = this.buildHeaders();
      delete headers["content-type"];
      const response = await axios.get(`${this.baseURL}/v1/credit/remain/overview`, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async generate({
    voiceId = "v000003",
    text = "gg chy",
    speed = 1,
    pitch = 0,
    volume = 1,
    emotion = "Happy",
    format = "mp3",
    token,
    ...rest
  }) {
    try {
      this.token = token || this.token;
      if (!this.token) {
        await this.register();
        await this.getCreditOverview();
      }
      const response = await axios.post(`${this.baseURL}/v1/tts/generate`, {
        voiceId: voiceId,
        text: text,
        speed: speed,
        pitch: pitch,
        volume: volume,
        emotion: emotion,
        format: format,
        ...rest
      }, {
        headers: this.buildHeaders()
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async voice_list({
    text = "",
    avatarId = "",
    token,
    ...rest
  }) {
    try {
      this.token = token || this.token;
      if (!this.token) {
        await this.register();
        await this.getCreditOverview();
      }
      const headers = this.buildHeaders();
      delete headers["content-type"];
      const response = await axios.get(`${this.baseURL}/v1/voice/recommend/list`, {
        params: {
          text: text,
          avatarId: avatarId,
          ...rest
        },
        headers: headers
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  getCredentials() {
    return {
      email: this.email,
      password: this.password,
      token: this.token,
      sessionId: this.sessionId
    };
  }
  setCredentials({
    email,
    password,
    token,
    sessionId
  }) {
    if (email) this.email = email;
    if (password) this.password = password;
    if (token) this.token = token;
    if (sessionId) this.sessionId = sessionId;
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
        action: "register | generate | voice_list"
      }
    });
  }
  const mic = new JoyPixClient();
  try {
    let result;
    switch (action) {
      case "register":
        result = await mic[action](params);
        break;
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      case "voice_list":
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: register | generate | voice_list`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}