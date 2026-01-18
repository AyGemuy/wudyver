import axios from "axios";
const CONFIG = {
  API_KEY: "Y8gUKumY7SyDpx3B2PuGjqzJw",
  BASE_URL: "https://ngedrakor.in/api",
  PACKAGE: "com.kpbarunonton.kordra.drakor"
};
class NgedrakorService {
  constructor() {
    this.apiKey = CONFIG.API_KEY;
    this.baseUrl = CONFIG.BASE_URL;
    this.axios = axios.create({
      timeout: 15e3,
      headers: {
        "Accept-Encoding": "gzip"
      }
    });
  }
  _log(method, message, isError = false) {
    const timestamp = new Date().toISOString();
    const prefix = isError ? `[ERROR]` : `[INFO]`;
    console.log(`${prefix} [${timestamp}] [NgedrakorService -> ${method}]: ${message}`);
  }
  async auth() {
    this._log("auth", "Menggunakan kredensial statis.");
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl
    };
  }
  async ensureToken({
    apiKey,
    baseUrl
  } = {}) {
    if (apiKey) this.apiKey = apiKey;
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  h(path, data = null) {
    const headers = {
      "User-Agent": "okhttp/3.14.9",
      apikey: this.apiKey,
      Connection: "Keep-Alive"
    };
    let body = data;
    if (data) {
      const params = new URLSearchParams();
      Object.keys(data).forEach(k => params.append(k, data[k]));
      body = params.toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
    return {
      method: "POST",
      url: `${this.baseUrl}${path}`,
      headers: headers,
      data: body
    };
  }
  async settings({
    ...rest
  } = {}) {
    const method = "settings";
    try {
      await this.ensureToken(rest);
      this._log(method, `Requesting configuration...`);
      const res = await this.axios.request(this.h("/fetchSettings"));
      if (!res.data.status) throw new Error(res.data.message || "Gagal fetch settings");
      return res.data;
    } catch (e) {
      this._log(method, e.message, true);
      throw e;
    }
  }
  async home({
    userId = "0",
    ...rest
  } = {}) {
    const method = "home";
    try {
      await this.ensureToken(rest);
      this._log(method, `Fetching home data for user: ${userId}`);
      const res = await this.axios.request(this.h("/fetchHomePageData", {
        user_id: userId
      }));
      return res.data;
    } catch (e) {
      this._log(method, `Network/API Error: ${e.message}`, true);
      throw e;
    }
  }
  async search({
    keyword = "",
    start = 0,
    limit = 10,
    ...rest
  } = {}) {
    const method = "search";
    try {
      await this.ensureToken(rest);
      this._log(method, `Searching for: "${keyword}" (start: ${start})`);
      const res = await this.axios.request(this.h("/searchContent", {
        start: start,
        limit: limit,
        keyword: keyword
      }));
      return res.data;
    } catch (e) {
      this._log(method, `Search failed: ${e.message}`, true);
      throw e;
    }
  }
  async detail({
    content_id,
    userId = "0",
    ...rest
  } = {}) {
    const method = "detail";
    try {
      await this.ensureToken(rest);
      if (!content_id) throw new Error("ID Konten (content_id) tidak boleh kosong.");
      this._log(method, `Fetching detail & updating views for ID: ${content_id}`);
      const [detailRes, viewRes] = await Promise.all([this.axios.request(this.h("/fetchContentDetails", {
        user_id: userId,
        content_id: content_id
      })), this.axios.request(this.h("/increaseContentView", {
        content_id: content_id
      })).catch(err => {
        this._log("increaseView", `Silent Fail: ${err.message}`, true);
        return {
          data: {
            status: false
          }
        };
      })]);
      return detailRes.data;
    } catch (e) {
      this._log(method, `Detail Error: ${e.message}`, true);
      throw e;
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
      error: "Parameter 'action' wajib diisi.",
      actions: ["auth", "settings", "home", "search", "detail"]
    });
  }
  const api = new NgedrakorService();
  try {
    let response;
    switch (action) {
      case "auth":
        response = await api.auth();
        break;
      case "settings":
        response = await api.settings(params);
        break;
      case "home":
        response = await api.home(params);
        break;
      case "search":
        const searchKeyword = params.keyword || params.query;
        if (!searchKeyword) {
          return res.status(400).json({
            error: "Parameter 'keyword' wajib diisi untuk search."
          });
        }
        response = await api.search({
          ...params,
          keyword: searchKeyword
        });
        break;
      case "detail":
        if (!params.content_id) {
          return res.status(400).json({
            error: "Parameter 'content_id' wajib diisi untuk detail."
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["auth", "settings", "home", "search", "detail"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      status: false,
      error: error?.message || "Internal Server Error"
    });
  }
}