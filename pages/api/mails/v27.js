import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Origin": "android-app",
      "X-Package-Name": "com.tmp.mail",
      "User-Agent": "okhttp/4.9.0"
    };
    this.client = axios.create({
      baseURL: "https://tmp.al",
      timeout: 6e4,
      headers: this.defaultHeaders
    });
    this.internalToken = null;
    this.fakeFcmToken = "f" + crypto.randomBytes(11).toString("hex") + ":APA91b" + crypto.randomBytes(100).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  }
  _getConfig(token) {
    return {
      headers: {
        ...this.defaultHeaders,
        Authorization: `Bearer ${token}`
      }
    };
  }
  async _resolveToken(providedToken) {
    if (providedToken) return providedToken;
    if (this.internalToken) return this.internalToken;
    try {
      console.log(" -> [1] Requesting access_token...");
      const response = await this.client.get("/api/auth");
      if (response.data && response.data.access_token) {
        this.internalToken = response.data.access_token;
        return this.internalToken;
      }
      throw new Error("No access_token in response");
    } catch (error) {
      console.error("Auth Failed:", error.message);
      throw error;
    }
  }
  async _registerDevice(token) {
    try {
      const config = this._getConfig(token);
      const payload = {
        deviceToken: this.fakeFcmToken,
        platform: "android"
      };
      await this.client.post("/api/device/register", payload, config);
    } catch (error) {}
  }
  async create({
    token
  } = {}) {
    try {
      const useToken = await this._resolveToken(token);
      const config = this._getConfig(useToken);
      await this._registerDevice(useToken);
      console.log(" -> [3] Getting Domains...");
      const domainRes = await this.client.get("/api/domains", config);
      if (!domainRes.data || domainRes.data.length === 0) {
        throw new Error("No domains available");
      }
      const domains = domainRes.data;
      const domain = domains[Math.floor(Math.random() * domains.length)];
      console.log(`    Selected Domain: ${domain}`);
      console.log(" -> [4] Getting Username...");
      const userRes = await this.client.get("/api/username/random", config);
      let username = userRes.data.username || userRes.data;
      if (typeof username !== "string") username = String(username);
      username = username.replace(/[^a-z0-9]/gi, "");
      const emailAddress = `${username}@${domain}`;
      try {
        await this.client.post(`/api/inbox/${emailAddress}/watch`, null, config);
      } catch (e) {}
      return {
        email: emailAddress,
        token: useToken,
        domain: domain
      };
    } catch (error) {
      throw new Error(`Create Failed: ${error.message}`);
    }
  }
  async message({
    token,
    email
  } = {}) {
    if (!email) throw new Error("Email required");
    try {
      const useToken = await this._resolveToken(token);
      const config = this._getConfig(useToken);
      const listUrl = `/api/inbox/${email}`;
      const listRes = await this.client.get(listUrl, config);
      const messages = listRes.data;
      let latestContent = null;
      if (Array.isArray(messages) && messages.length > 0) {
        latestContent = messages[0];
      }
      return {
        email: email,
        total: Array.isArray(messages) ? messages.length : 0,
        latest_message: latestContent,
        messages_list: messages
      };
    } catch (error) {
      const msg = error.response ? `Status ${error.response.status}` : error.message;
      throw new Error(`Get Message Failed: ${msg}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create"
      }
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.token || !params.email) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' dan 'email' wajib diisi untuk action 'message'."
          });
        }
        response = await api.message(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}