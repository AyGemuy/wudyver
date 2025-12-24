import axios from "axios";
import crypto from "crypto";
class JowoDramaAPI {
  constructor() {
    this.cfg = {
      baseUrl: "https://us-drama-api.pixtv.cc",
      timeout: 6e4,
      headers: {
        "user-agent": "okhttp/4.12.0",
        accept: "application/json",
        "accept-encoding": "gzip, deflate, br",
        "content-type": "application/json; charset=utf-8",
        channel: "google",
        source: "android",
        version: "1.0.45",
        vcode: "60",
        language: "en"
      },
      endpoints: {
        baseConfig: "/Config/getBaseConfig",
        init: "/Android/Users/init",
        userInfo: "/Android/Users/getUserInfo",
        userReward: "/Android/Users/getUserRewardInfo",
        videoList: "/Android/VideoCenter/getVideoList",
        videoDrama: "/Android/VideoCenter/getVideoDrama",
        videoSearch: "/Android/VideoCenter/videoSearch",
        recEnd: "/Android/VideoCenter/getEndRecommend",
        recNew: "/Android/VideoCenter/getNewUseRecommend",
        recList: "/Android/VideoCenter/getRecommendList",
        historyGet: "/Android/Users/getVideoHistory",
        historyDel: "/Android/Users/cancelVideoHistory",
        rackGet: "/Android/Users/getVideosRack",
        rackSave: "/Android/Users/savaVideoRack",
        rackDel: "/Android/Users/cancelVideoRack"
      }
    };
    this.session = {
      token: null,
      device: this._genDevice()
    };
    this.client = axios.create({
      baseURL: this.cfg.baseUrl,
      timeout: this.cfg.timeout
    });
    console.log("[JowoDrama] Client initialized with device:", {
      aid: this.session.device.aid.substring(0, 8) + "...",
      gaid: this.session.device.gaid.substring(0, 8) + "...",
      system: this.session.device.systemversion
    });
  }
  _genDevice() {
    const brands = {
      samsung: [{
        brand: "samsung",
        model: "SM-G998B",
        android: "14"
      }, {
        brand: "samsung",
        model: "SM-A546E",
        android: "14"
      }, {
        brand: "samsung",
        model: "SM-S918B",
        android: "14"
      }],
      xiaomi: [{
        brand: "Xiaomi",
        model: "23078PND5G",
        android: "14"
      }, {
        brand: "Redmi",
        model: "23129RAA4G",
        android: "13"
      }, {
        brand: "POCO",
        model: "23124RA7EO",
        android: "13"
      }],
      oppo: [{
        brand: "OPPO",
        model: "CPH2531",
        android: "14"
      }, {
        brand: "OPPO",
        model: "CPH2591",
        android: "13"
      }, {
        brand: "realme",
        model: "RMX3910",
        android: "13"
      }],
      vivo: [{
        brand: "vivo",
        model: "V2250",
        android: "13"
      }, {
        brand: "vivo",
        model: "V2309",
        android: "14"
      }]
    };
    const brandKeys = Object.keys(brands);
    const selectedBrand = brandKeys[Math.floor(Math.random() * brandKeys.length)];
    const devices = brands[selectedBrand];
    const device = devices[Math.floor(Math.random() * devices.length)];
    return {
      aid: Array.from({
        length: 16
      }, () => Math.random().toString(36).charAt(2)).join(""),
      gaid: crypto.randomUUID(),
      systemversion: `${device.brand}|${device.model}|${device.android}`
    };
  }
  _headers() {
    return {
      ...this.cfg.headers,
      aid: this.session.device.aid,
      gaid: this.session.device.gaid,
      systemversion: this.session.device.systemversion,
      ts: Math.floor(Date.now() / 1e3).toString(),
      token: this.session.token || ""
    };
  }
  async _req(keyName, payload = {}, isRetry = false) {
    const label = `[${keyName}]`;
    try {
      if (!this.session.token && keyName !== "init") {
        console.log(`${label} No token found, auto-initializing...`);
        await this.init();
      }
      const url = this.cfg.endpoints[keyName];
      if (!url) {
        console.error(`${label} Endpoint not found in config`);
        throw new Error(`Endpoint '${keyName}' not found`);
      }
      console.log(`${label} Requesting with payload:`, JSON.stringify(payload).substring(0, 100));
      const response = await this.client.post(url, payload, {
        headers: this._headers()
      });
      const data = response?.data;
      console.log(`${label} Response code: ${data?.code}, message: ${data?.msg || "OK"}`);
      if (data?.code === 401 && !isRetry) {
        console.warn(`${label} Token expired (401), refreshing session...`);
        this.session.token = null;
        await this.init();
        return await this._req(keyName, payload, true);
      }
      if (data?.code !== 200 && data?.code !== 0) {
        console.warn(`${label} API returned non-success code: ${data?.code}`);
      }
      return data?.data || {};
    } catch (error) {
      console.error(`${label} Request failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data
      });
      throw error;
    }
  }
  async init({
    ...rest
  } = {}) {
    const label = "[INIT]";
    try {
      console.log(`${label} Initializing session...`);
      const h = this._headers();
      delete h.token;
      const payload = {
        aid: this.session.device.aid,
        ...rest
      };
      console.log(`${label} Payload:`, payload);
      const res = await this.client.post(this.cfg.endpoints.init, payload, {
        headers: h
      });
      const data = res?.data;
      console.log(`${label} Response:`, {
        code: data?.code,
        msg: data?.msg,
        hasToken: !!data?.data?.token
      });
      const token = data?.data?.token;
      if (token) {
        this.session.token = token;
        console.log(`${label} ✓ Session initialized, token: ${token.substring(0, 12)}...`);
        return {
          success: true,
          token: token.substring(0, 12) + "..."
        };
      }
      console.error(`${label} ✗ No token received in response`);
      return {
        success: false,
        error: "No token received"
      };
    } catch (error) {
      console.error(`${label} ✗ Initialization failed:`, {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      throw error;
    }
  }
  async getConfig() {
    console.log("[CONFIG] Fetching base config...");
    return await this._req("baseConfig");
  }
  async getUser() {
    console.log("[USER] Fetching user info...");
    return await this._req("userInfo");
  }
  async getReward() {
    console.log("[REWARD] Fetching user rewards...");
    return await this._req("userReward");
  }
  async getList({
    page = 1,
    blockId = 1,
    ...rest
  } = {}) {
    console.log("[LIST] Fetching video list:", {
      page: page,
      blockId: blockId
    });
    return await this._req("videoList", {
      page: page.toString(),
      blockId: blockId.toString(),
      ...rest
    });
  }
  async getDetail({
    vid,
    ...rest
  } = {}) {
    console.log("[DETAIL] Fetching video detail:", {
      vid: vid
    });
    return await this._req("videoDrama", {
      vid: vid?.toString(),
      ...rest
    });
  }
  async search({
    keyword,
    ...rest
  } = {}) {
    console.log("[SEARCH] Searching videos:", {
      keyword: keyword
    });
    return await this._req("videoSearch", {
      keyword: keyword,
      ...rest
    });
  }
  async getRecommend({
    type = "list",
    ...rest
  } = {}) {
    console.log("[RECOMMEND] Fetching recommendations:", {
      type: type
    });
    const ep = type === "end" ? "recEnd" : type === "new" ? "recNew" : "recList";
    return await this._req(ep, rest);
  }
  async getHistory({
    ...rest
  } = {}) {
    console.log("[HISTORY] Fetching watch history...");
    return await this._req("historyGet", rest);
  }
  async delHistory({
    ...rest
  } = {}) {
    console.log("[HISTORY] Deleting history item...");
    return await this._req("historyDel", rest);
  }
  async getRack({
    ...rest
  } = {}) {
    console.log("[RACK] Fetching my list...");
    return await this._req("rackGet", rest);
  }
  async saveRack({
    vid,
    ...rest
  } = {}) {
    console.log("[RACK] Saving to my list:", {
      vid: vid
    });
    return await this._req("rackSave", {
      vid: vid,
      ...rest
    });
  }
  async delRack({
    ...rest
  } = {}) {
    console.log("[RACK] Removing from my list...");
    return await this._req("rackDel", rest);
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!action) {
      return res.status(400).json({
        error: "Missing required field: action",
        required: {
          action: ["init", "config", "user", "reward", "list", "detail", "search", "recommend", "history", "del_history", "rack", "save_rack", "del_rack"]
        }
      });
    }
    const api = new JowoDramaAPI();
    let result;
    switch (action) {
      case "init":
        result = await api.init(params);
        break;
      case "config":
        result = await api.getConfig();
        break;
      case "user":
        result = await api.getUser();
        break;
      case "reward":
        result = await api.getReward();
        break;
      case "list":
        result = await api.getList(params);
        break;
      case "detail":
        if (!params.vid) {
          return res.status(400).json({
            error: `Missing required field: vid (required for ${action})`
          });
        }
        result = await api.getDetail(params);
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            error: `Missing required field: keyword (required for ${action})`
          });
        }
        result = await api.search(params);
        break;
      case "recommend":
        result = await api.getRecommend(params);
        break;
      case "history":
        result = await api.getHistory(params);
        break;
      case "del_history":
        result = await api.delHistory(params);
        break;
      case "rack":
        result = await api.getRack(params);
        break;
      case "save_rack":
        if (!params.vid) {
          return res.status(400).json({
            error: `Missing required field: vid (required for ${action})`
          });
        }
        result = await api.saveRack(params);
        break;
      case "del_rack":
        result = await api.delRack(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          allowed: ["init", "config", "user", "reward", "list", "detail", "search", "recommend", "history", "del_history", "rack", "save_rack", "del_rack"]
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      code: 500
    });
  }
}