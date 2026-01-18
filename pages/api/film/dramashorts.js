import axios from "axios";
import crypto from "crypto";
class DramaShortsApi {
  constructor() {
    this.token = null;
    this.isAuthenticating = false;
    this.axios = axios.create({
      timeout: 3e4,
      validateStatus: s => s < 500
    });
    this.cfg = {
      base: "https://api.dramashorts.io/v1",
      google: {
        url: "https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyD1xtJkrnqzp_omlEi8IroscW-ezwxu1os",
        headers: {
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
          "Content-Type": "application/json",
          "X-Android-Package": "io.drama.shorts",
          "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
          "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android"
        }
      },
      headers: {
        "User-Agent": "okhttp/5.3.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-os": "android",
        "x-os-version": "35",
        "x-app-version": "4.9.0",
        "x-interface-language": "en"
      }
    };
  }
  _log(type, msg) {
    console.log(`[${new Date().toISOString()}] [${type.toUpperCase()}] ${msg}`);
  }
  async _req(opt) {
    this._log("req", `${opt.method} ${opt.url}`);
    try {
      const {
        data
      } = await this.axios(opt);
      return data;
    } catch (e) {
      this._log("err", e.message);
      throw e;
    }
  }
  _map(data) {
    if (data && typeof data === "object" && !Array.isArray(data) && "0" in data) {
      return Object.values(data);
    }
    return data;
  }
  _fmt(res) {
    let d = res?.result || res;
    if (d?.movies && !Array.isArray(d.movies) && "0" in d.movies) {
      d.movies = Object.values(d.movies);
    } else if (d && !Array.isArray(d) && "0" in d) {
      d = Object.values(d);
    }
    return Array.isArray(d) ? {
      data: d,
      token: this.token
    } : {
      ...d,
      token: this.token
    };
  }
  async auth() {
    if (this.isAuthenticating) {
      this._log("info", "Authentication in progress, waiting...");
      for (let i = 0; i < 20; i++) {
        if (!this.isAuthenticating && this.token) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (this.token) return {
        token: this.token
      };
      throw new Error("Authentication timeout");
    }
    this.isAuthenticating = true;
    try {
      this._log("auth", "Starting authentication...");
      const gRes = await this._req({
        method: "POST",
        url: this.cfg.google.url,
        headers: this.cfg.google.headers,
        data: {
          email: `${crypto.randomUUID()}@emailhook.site`,
          password: crypto.randomUUID(),
          clientType: "CLIENT_TYPE_ANDROID"
        }
      });
      if (!gRes?.idToken) {
        throw new Error("No idToken from Google auth");
      }
      this.token = gRes.idToken;
      this._log("auth", `Got Google token: ${this.token.substring(0, 20)}...`);
      const appRes = await this._req({
        method: "POST",
        url: `${this.cfg.base}/demand-auth-create`,
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${this.token}`
        },
        data: {
          data: {}
        }
      });
      this._log("auth", "App authentication successful");
      return this._fmt(appRes);
    } catch (error) {
      this.token = null;
      this._log("auth-error", error.message);
      throw error;
    } finally {
      this.isAuthenticating = false;
    }
  }
  async ensure(t) {
    if (t) {
      this.token = t;
      return;
    }
    if (this.token) {
      return;
    }
    await this.auth();
  }
  async _post(path, data, token) {
    const useToken = token || this.token;
    if (!useToken) {
      await this.ensure();
    }
    try {
      const res = await this._req({
        method: "POST",
        url: `${this.cfg.base}/${path}`,
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${useToken || this.token}`
        },
        data: {
          data: data
        }
      });
      return this._fmt(res);
    } catch (error) {
      if (error.response?.status === 401 || error.message.includes("auth")) {
        this._log("warn", "Token mungkin expired, mencoba auth ulang...");
        this.token = null;
        await this.auth();
        const retryRes = await this._req({
          method: "POST",
          url: `${this.cfg.base}/${path}`,
          headers: {
            ...this.cfg.headers,
            authorization: `Bearer ${this.token}`
          },
          data: {
            data: data
          }
        });
        return this._fmt(retryRes);
      }
      throw error;
    }
  }
  async home({
    token,
    ...params
  } = {}) {
    return await this._post("demand-discover-block-movie-list", {
      block_id: "popular_choices",
      offset: 0,
      limit: 12,
      excluded_movie_ids: [],
      ...params
    }, token);
  }
  async discoverTab({
    token,
    ...params
  } = {}) {
    return await this._post("demand-discover-tab-get", {
      movies_limit: 9,
      ...params
    }, token);
  }
  async shorts({
    token,
    ...params
  } = {}) {
    return await this._post("demand-shorts-get", {
      ...params
    }, token);
  }
  async continueWatching({
    token,
    ...params
  } = {}) {
    return await this._post("demand-continueWatching-get", {
      limit: 1,
      ...params
    }, token);
  }
  async trendingTags({
    token,
    ...params
  } = {}) {
    return await this._post("demand-tag-topTrending-list", {
      ...params
    }, token);
  }
  async trendingMovies({
    token,
    ...params
  } = {}) {
    return await this._post("demand-movie-topTrending-list", {
      ...params
    }, token);
  }
  async search({
    token,
    query,
    ...params
  } = {}) {
    return await this._post("demand-movie-search-list", {
      query: query,
      ...params
    }, token);
  }
  async detail({
    token,
    movie_id,
    ...params
  } = {}) {
    return await this._post("demand-movie-details-get", {
      movie_id: movie_id,
      ...params
    }, token);
  }
  async episodes({
    token,
    movie_id,
    ...params
  } = {}) {
    return await this._post("demand-episodes-get", {
      movie_id: movie_id,
      ...params
    }, token);
  }
  async recommended({
    token,
    movie_id,
    ...params
  } = {}) {
    return await this._post("demand-movie-recommended-list", {
      movie_id: movie_id,
      ...params
    }, token);
  }
  async stream({
    token,
    movie_id,
    episode_id,
    ...params
  } = {}) {
    return await this._post("demand-episode-access", {
      movie_id: movie_id,
      episode_id: episode_id,
      ...params
    }, token);
  }
  async profile({
    token,
    ...params
  } = {}) {
    return await this._post("demand-profile-get", {
      ...params
    }, token);
  }
  async giftConfig({
    token,
    ...params
  } = {}) {
    return await this._post("demand-ad-gift-config-get", {
      ...params
    }, token);
  }
  async giftCheckin({
    token,
    ...params
  } = {}) {
    return await this._post("demand-gift-checkin-apply", {
      ...params
    }, token);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const availableActions = ["auth", "home", "discover", "shorts", "continue", "tags", "trending", "search", "detail", "episodes", "recommended", "stream", "profile", "gift_config", "gift_checkin"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: availableActions
    });
  }
  const api = new DramaShortsApi();
  try {
    let response;
    switch (action) {
      case "auth":
        response = await api.auth();
        break;
      case "home":
        response = await api.home(params);
        break;
      case "discover":
        response = await api.discoverTab(params);
        break;
      case "shorts":
        response = await api.shorts(params);
        break;
      case "continue":
        response = await api.continueWatching(params);
        break;
      case "tags":
        response = await api.trendingTags(params);
        break;
      case "trending":
        response = await api.trendingMovies(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Param 'query' is required"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.movie_id) {
          return res.status(400).json({
            error: "Param 'movie_id' is required"
          });
        }
        response = await api.detail(params);
        break;
      case "episodes":
        if (!params.movie_id) {
          return res.status(400).json({
            error: "Param 'movie_id' is required"
          });
        }
        response = await api.episodes(params);
        break;
      case "recommended":
        if (!params.movie_id) {
          return res.status(400).json({
            error: "Param 'movie_id' is required"
          });
        }
        response = await api.recommended(params);
        break;
      case "stream":
        if (!params.movie_id || !params.episode_id) {
          return res.status(400).json({
            error: "Params 'movie_id' and 'episode_id' are required"
          });
        }
        response = await api.stream(params);
        break;
      case "profile":
        response = await api.profile(params);
        break;
      case "gift_config":
        response = await api.giftConfig(params);
        break;
      case "gift_checkin":
        response = await api.giftCheckin(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: availableActions
        });
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error(`[FATAL] ${action}:`, err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}