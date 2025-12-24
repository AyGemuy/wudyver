import fetch from "node-fetch";
import {
  randomUUID
} from "crypto";
const MAYA_BASE_URL = "https://a.mayavip.xyz/api";
const MAYA_APP_ID = "pcnffjfv8em9oeux9rpjwtytuvhias8v";
const DEFAULT_DEVICE = {
  timezone: "Asia/Jakarta",
  packageInfo: {
    version: "4.0.0",
    buildNumber: "4"
  },
  androidInfo: {
    model: "SM-A505F",
    version: "10"
  }
};
class MayaApi {
  constructor({
    debug = false
  } = {}) {
    this.sessions = new Map();
    this.debug = debug;
    this.currentUdid = null;
  }
  _log(...args) {
    if (this.debug) {
      console.log("[MayaApi]", ...args);
    }
  }
  _error(...args) {
    console.error("[MayaApi ERROR]", ...args);
  }
  _getSession(udid) {
    const sessionUdid = udid || this.currentUdid;
    if (!sessionUdid) {
      throw new Error("No UDID available");
    }
    if (!this.sessions.has(sessionUdid)) {
      const device = {
        ...DEFAULT_DEVICE,
        udid: sessionUdid
      };
      this.sessions.set(sessionUdid, {
        token: null,
        userId: null,
        device: device
      });
    }
    return this.sessions.get(sessionUdid);
  }
  _buildHeaders(udid) {
    const session = this._getSession(udid);
    const headers = {
      "Content-Type": "application/json"
    };
    if (session.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }
    return headers;
  }
  async _fetch(udid, endpoint, method = "GET", payload = null) {
    const sessionUdid = udid || this.currentUdid;
    if (!sessionUdid) {
      throw new Error("No UDID available for request");
    }
    const url = MAYA_BASE_URL + endpoint;
    const options = {
      method: method,
      headers: this._buildHeaders(sessionUdid),
      ...payload && {
        body: JSON.stringify(payload)
      }
    };
    this._log(`[${method}] ${endpoint} | UDID: ${sessionUdid.slice(0, 8)}...`);
    if (payload) this._log("→ Payload:", payload);
    let response, text, data;
    try {
      response = await fetch(url, options);
      text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      this._error("Fetch/Parse failed:", err.message);
      throw new Error(`Request failed: ${err.message}`);
    }
    this._log("← Response:", data);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    if (data.error_code != null && data.error_code !== 0) {
      throw new Error(`API Error [${data.error_code}]: ${data.message || "Unknown"}`);
    }
    return data;
  }
  async ensure(udid) {
    let sessionUdid = udid || this.currentUdid;
    if (!sessionUdid) {
      sessionUdid = `node-udid-${randomUUID()}`;
      this.currentUdid = sessionUdid;
      this._log(`Generated new UDID: ${sessionUdid}`);
    }
    const session = this._getSession(sessionUdid);
    if (session.token) {
      return {
        udid: sessionUdid,
        userId: session.userId,
        token: session.token
      };
    }
    try {
      const initResult = await this._fetch(sessionUdid, "/init", "POST", {
        app_id: MAYA_APP_ID,
        version: session.device.packageInfo.version,
        device: {
          udid: sessionUdid,
          name: session.device.androidInfo.model,
          system: session.device.androidInfo.version,
          network: {
            vpn: false
          },
          language: "en-US",
          timezone: session.device.timezone
        }
      });
      const loginResult = await this._fetch(sessionUdid, "/login", "POST", {
        app_id: MAYA_APP_ID,
        udid: sessionUdid,
        profile: {
          gender: 2
        }
      });
      if (!loginResult.data?.api_token || !loginResult.data?.id) {
        throw new Error(`Login failed: missing token or id`);
      }
      session.token = loginResult.data.api_token;
      session.userId = loginResult.data.id;
      session.device.udid = sessionUdid;
      this._log(`Login success | User: ${session.userId} | Token: ${session.token.slice(0, 20)}...`);
      return {
        udid: sessionUdid,
        userId: session.userId,
        token: session.token
      };
    } catch (err) {
      this._error("Auth failed:", err.message);
      throw err;
    }
  }
  async user_info({
    udid = null
  } = {}) {
    try {
      await this.ensure(udid);
      return await this._fetch(udid, "/user");
    } catch (err) {
      this._error("user_info failed:", err.message);
      throw err;
    }
  }
  async search({
    udid = null,
    keyword = null,
    gender = null,
    result_type = null,
    quick = null,
    page = 1,
    per_page = 20
  } = {}) {
    try {
      await this.ensure(udid);
      const params = new URLSearchParams({
        ...keyword && {
          "filter[keyword]": keyword
        },
        ...gender && {
          "filter[gender]": gender
        },
        ...result_type && {
          "filter[result_type]": result_type
        },
        ...quick && {
          "filter[quick]": quick
        },
        per_page: per_page.toString(),
        page: page.toString()
      });
      return await this._fetch(udid, `/anchor/list?${params}`);
    } catch (err) {
      this._error("search failed:", err.message);
      throw err;
    }
  }
  async chat({
    udid = null,
    to_user_id,
    text_content,
    msg_id = null
  } = {}) {
    try {
      await this.ensure(udid);
      const payload = msg_id ? {
        msg_id: msg_id,
        to_type: 2,
        content: {
          type: 202,
          text: text_content
        }
      } : {
        to: to_user_id,
        to_type: 2,
        content: {
          type: 202,
          text: text_content
        }
      };
      return await this._fetch(udid, "/chat/message", "POST", payload);
    } catch (err) {
      this._error("chat failed:", err.message);
      throw err;
    }
  }
  async chat_list({
    udid = null,
    other_id,
    start_at = 0,
    end_at = null,
    per_page = 200,
    page = 1
  } = {}) {
    try {
      await this.ensure(udid);
      const params = new URLSearchParams({
        "filter[other_id]": other_id,
        "filter[start_at]": start_at.toString(),
        ...end_at && {
          "filter[end_at]": end_at.toString()
        },
        per_page: per_page.toString(),
        page: page.toString()
      });
      return await this._fetch(udid, `/chat/message/list?${params}`);
    } catch (err) {
      this._error("chat_list failed:", err.message);
      throw err;
    }
  }
  async model({
    udid = null,
    id = null
  } = {}) {
    try {
      await this.ensure(udid);
      if (id !== null && id !== undefined) {
        return await this._fetch(udid, "/chat/style", "POST", {
          id: id
        });
      }
      return await this._fetch(udid, "/chat/styles");
    } catch (err) {
      this._error("model failed:", err.message);
      throw err;
    }
  }
  async read({
    udid = null,
    other_id,
    msg_ids
  } = {}) {
    try {
      await this.ensure(udid);
      return await this._fetch(udid, "/chat/messages/read", "POST", {
        other_id: other_id,
        msg_ids: Array.isArray(msg_ids) ? msg_ids : [msg_ids]
      });
    } catch (err) {
      this._error("read failed:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    udid,
    debug = false,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new MayaApi({
    debug: debug === "true" || debug === true
  });
  try {
    let response;
    switch (action) {
      case "ensure":
        response = await api.ensure(udid);
        break;
      case "user_info":
        response = await api.user_info({
          udid: udid
        });
        break;
      case "search":
        response = await api.search({
          udid: udid,
          ...params
        });
        break;
      case "chat":
        if (!params.to_user_id && !params.msg_id) {
          return res.status(400).json({
            error: "to_user_id atau msg_id wajib untuk chat"
          });
        }
        if (!params.text_content) {
          return res.status(400).json({
            error: "text_content wajib untuk chat"
          });
        }
        response = await api.chat({
          udid: udid,
          ...params
        });
        break;
      case "chat_list":
        if (!params.other_id) {
          return res.status(400).json({
            error: "other_id wajib untuk chat_list"
          });
        }
        response = await api.chat_list({
          udid: udid,
          ...params
        });
        break;
      case "model":
        response = await api.model({
          udid: udid,
          id: params.id
        });
        break;
      case "read":
        if (!params.other_id || !params.msg_ids) {
          return res.status(400).json({
            error: "other_id dan msg_ids wajib untuk read"
          });
        }
        response = await api.read({
          udid: udid,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Didukung: ensure, user_info, search, chat, chat_list, model, read`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[MAYA API ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}