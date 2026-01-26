import axios from "axios";
import crypto from "crypto";
class PlayPilotApi {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.profileId = null;
    this.userId = null;
    this.isAuthenticating = false;
    this.axios = axios.create({
      timeout: 12e4,
      validateStatus: status => status < 500
    });
    this.baseUrl = "https://atlas.playpilot.tech/api/v1";
    this.headers = {
      "User-Agent": "PlayPilot Android App",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      "sec-ch-ua-platform": '"Android"',
      "accept-language": "en",
      "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Android WebView";v="144"',
      "sec-ch-ua-mobile": "?1",
      origin: "https://playpilot.com",
      "x-requested-with": "com.playpilot.apps",
      "sec-fetch-site": "cross-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer: "https://playpilot.com/",
      priority: "u=1, i"
    };
  }
  _log(type, msg) {
    console.log(`[${new Date().toISOString()}] [${type.toUpperCase()}] ${msg}`);
  }
  async _req(config) {
    this._log("req", `${config.method} ${config.url}`);
    try {
      const response = await this.axios(config);
      return response.data;
    } catch (error) {
      this._log("err", error.message);
      if (error.response) {
        this._log("err", `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
  _generateRandomCredentials() {
    const randomString = crypto.randomBytes(8).toString("hex");
    const domains = ["gmail.com", "yahoo.com", "outlook.com", "protonmail.com"];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const username = `user_${randomString}`;
    const email = `${username}@${domain}`;
    const password = `${crypto.randomBytes(12).toString("hex")}@Aa1`;
    const displayName = `User${randomString.substring(0, 6)}`;
    return {
      username: username,
      email: email,
      password: password,
      displayName: displayName
    };
  }
  async auth(credentials = null) {
    if (this.isAuthenticating) {
      this._log("info", "Authentication in progress, waiting...");
      for (let i = 0; i < 20; i++) {
        if (!this.isAuthenticating && this.token) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (this.token) return {
        token: this.token,
        refreshToken: this.refreshToken
      };
      throw new Error("Authentication timeout");
    }
    this.isAuthenticating = true;
    try {
      this._log("auth", "Starting authentication...");
      const creds = credentials || this._generateRandomCredentials();
      const data = {
        email: creds.email,
        password: creds.password,
        first_name: creds.username,
        profile: {
          display_name: creds.displayName,
          full_language: "en-US",
          preferred_region: "us",
          subscriber: true,
          disabled_scopes: ["rating:cta"]
        }
      };
      const config = {
        method: "POST",
        url: `${this.baseUrl}/auth/signup/`,
        headers: this.headers,
        data: JSON.stringify(data)
      };
      const response = await this._req(config);
      if (!response.jwt_token?.access) {
        throw new Error("No access token received");
      }
      this.token = response.jwt_token.access;
      this.refreshToken = response.jwt_token.refresh;
      this.profileId = response.profile?.id;
      this.userId = response.profile?.id;
      this._log("auth", `Authentication successful. Token: ${this.token.substring(0, 20)}...`);
      this._log("auth", `Profile ID: ${this.profileId}, User ID: ${this.userId}`);
      this._log("auth", `Email: ${creds.email}, Password: ${creds.password}`);
      return {
        token: this.token,
        refreshToken: this.refreshToken,
        profileId: this.profileId,
        userId: this.userId,
        credentials: creds
      };
    } catch (error) {
      this.token = null;
      this.refreshToken = null;
      this._log("auth-error", error.message);
      throw error;
    } finally {
      this.isAuthenticating = false;
    }
  }
  async ensureAuth(token = null) {
    if (token) {
      this.token = token;
      return;
    }
    if (this.token) {
      return;
    }
    await this.auth();
  }
  async _get(endpoint, params = {}, useAuth = true, token = null) {
    const useToken = token || this.token;
    if (useAuth && !useToken) {
      await this.ensureAuth();
    }
    const headers = {
      ...this.headers
    };
    if (useAuth && useToken) {
      headers["authorization"] = `Bearer ${useToken}`;
    }
    const config = {
      method: "GET",
      url: `${this.baseUrl}${endpoint}`,
      headers: headers,
      params: params
    };
    try {
      return await this._req(config);
    } catch (error) {
      if (error.response?.status === 401 && useAuth) {
        this._log("warn", "Token mungkin expired, mencoba auth ulang...");
        this.token = null;
        await this.auth();
        headers["authorization"] = `Bearer ${this.token}`;
        config.headers = headers;
        return await this._req(config);
      }
      throw error;
    }
  }
  async _post(endpoint, data = {}, useAuth = true, token = null) {
    const useToken = token || this.token;
    if (useAuth && !useToken) {
      await this.ensureAuth();
    }
    const headers = {
      ...this.headers
    };
    if (useAuth && useToken) {
      headers["authorization"] = `Bearer ${useToken}`;
    }
    const config = {
      method: "POST",
      url: `${this.baseUrl}${endpoint}`,
      headers: headers,
      data: JSON.stringify(data)
    };
    try {
      return await this._req(config);
    } catch (error) {
      if (error.response?.status === 401 && useAuth) {
        this._log("warn", "Token mungkin expired, mencoba auth ulang...");
        this.token = null;
        await this.auth();
        headers["authorization"] = `Bearer ${this.token}`;
        config.headers = headers;
        return await this._req(config);
      }
      throw error;
    }
  }
  async browseTitles({
    token,
    language = "en-US",
    region = "us",
    page = 1,
    pageSize = 14,
    category = null,
    ordering = null,
    providers = []
  } = {}) {
    const params = {
      language: language,
      region: region,
      include_count: false,
      exclude_hidden_titles: true,
      device: "android",
      page: page,
      page_size: pageSize
    };
    if (category) params.category = category;
    if (ordering) params.ordering = ordering;
    if (providers.length > 0) {
      providers.forEach((provider, index) => {
        params[`providers[${index}]`] = provider;
      });
    }
    return await this._get("/titles/browse/", params, true, token);
  }
  async notifications({
    token,
    language = "en-US",
    region = "us",
    limit = 50
  } = {}) {
    const scopes = ["collection:promotion", "feature:release", "follower:added", "discover-weekly:promotion", "profile:signup", "provider:release", "rating:cta", "relationship:suggestion", "title:promotion", "title:suggestion", "titlecomment:like", "titlecomment:reply", "titlecomment:tag", "relationshiprequest:new", "relationshiprequest:approved"];
    const params = {
      language: language,
      region: region,
      limit: limit
    };
    scopes.forEach((scope, index) => {
      params[`scopes[${index}]`] = scope;
    });
    return await this._get("/notification/filter/", params, true, token);
  }
  async trailers({
    token,
    language = "en-US",
    region = "us",
    page = 1,
    pageSize = 30
  } = {}) {
    const params = {
      language: language,
      region: region,
      page: page,
      page_size: pageSize,
      include_count: false
    };
    return await this._get("/trailers/browse/", params, false, token);
  }
  async playlists({
    token,
    language = "en-US",
    region = "us",
    pageSize = 8,
    category = "popular",
    ordering = "-score"
  } = {}) {
    const params = {
      language: language,
      region: region,
      page_size: pageSize,
      include_count: false,
      category: category,
      ordering: ordering,
      media_formats: "video"
    };
    return await this._get("/playlists/browse/", params, true, token);
  }
  async most_watchlisted({
    token,
    language = "en-US",
    region = "us",
    limit = 20
  } = {}) {
    const params = {
      language: language,
      region: region,
      limit: limit,
      full: true,
      exclude_hidden_titles: true,
      no_region_filter: true,
      content_types: "movie,series"
    };
    return await this._get("/titles/most-watchlisted/", params, true, token);
  }
  async playlist_detail({
    token,
    playlistId,
    language = "en-US",
    region = "us"
  } = {}) {
    if (!playlistId) {
      throw new Error("playlistId is required");
    }
    const params = {
      language: language,
      region: region
    };
    return await this._get(`/playlists/${playlistId}/`, params, true, token);
  }
  async latest_rated({
    token,
    language = "en-US",
    region = "us",
    limit = 12
  } = {}) {
    const params = {
      language: language,
      region: region,
      limit: limit,
      "content_types[]": ["movie", "series"]
    };
    return await this._get("/titles/latest-rated/", params, true, token);
  }
  async profiles({
    token,
    language = "en-US",
    region = "us",
    page = 1,
    pageSize = 25
  } = {}) {
    const params = {
      language: language,
      region: region,
      exclude_following: true,
      exclude_private: true,
      page: page,
      page_size: pageSize,
      include_count: false
    };
    return await this._get("/profiles/", params, true, token);
  }
  async boost({
    token,
    language = "en-US",
    region = "us",
    limit = 3,
    offset = 6
  } = {}) {
    const params = {
      language: language,
      region: region,
      limit: limit,
      offset: offset,
      include_count: false,
      exclude_hidden_titles: true
    };
    return await this._get("/boost/browse/", params, true, token);
  }
  async searchAlgolia({
    token,
    query,
    page = 0,
    hitsPerPage = 24
  } = {}) {
    if (!query) {
      throw new Error("query is required");
    }
    const data = {
      requests: [{
        query: query,
        page: page,
        indexName: "titles_gl",
        hitsPerPage: hitsPerPage,
        clickAnalytics: true
      }]
    };
    const config = {
      method: "POST",
      url: "https://dwqpg2sm09-1.algolianet.com/1/indexes/*/queries?x-algolia-agent=Algolia+for+JavaScript+%285.20.4%29%3B+Search+%285.20.4%29%3B+Browser&x-algolia-api-key=af4a594be0d30ff2eb3980be0b8684eb&x-algolia-application-id=DWQPG2SM09",
      headers: {
        ...this.headers,
        "Content-Type": "text/plain",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      },
      data: JSON.stringify(data)
    };
    return await this._req(config);
  }
  async title_detail({
    token,
    sids,
    language = "en-US",
    region = "us"
  } = {}) {
    if (!sids) {
      throw new Error("sids is required");
    }
    const params = {
      language: language,
      region: region,
      sids: sids,
      include_count: false,
      no_region_filter: true,
      include_cinema: true
    };
    return await this._get("/titles/browse/", params, true, token);
  }
  async getProfile({
    token
  } = {}) {
    return await this._get("/auth/me/", {}, true, token);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const availableActions = ["browse", "notifications", "trailers", "playlists", "most_watchlisted", "playlist_detail", "latest_rated", "profiles", "boost", "search", "title_detail", "profile"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: availableActions
    });
  }
  const api = new PlayPilotApi();
  try {
    let response;
    switch (action) {
      case "browse":
        response = await api.browseTitles(params);
        break;
      case "notifications":
        response = await api.notifications(params);
        break;
      case "trailers":
        response = await api.trailers(params);
        break;
      case "playlists":
        response = await api.playlists(params);
        break;
      case "most_watchlisted":
        response = await api.most_watchlisted(params);
        break;
      case "playlist_detail":
        if (!params.playlistId) {
          return res.status(400).json({
            error: "Param 'playlistId' is required"
          });
        }
        response = await api.playlist_detail(params);
        break;
      case "latest_rated":
        response = await api.latest_rated(params);
        break;
      case "profiles":
        response = await api.profiles(params);
        break;
      case "boost":
        response = await api.boost(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Param 'query' is required"
          });
        }
        response = await api.searchAlgolia(params);
        break;
      case "title_detail":
        if (!params.sids) {
          return res.status(400).json({
            error: "Param 'sids' is required"
          });
        }
        response = await api.title_detail(params);
        break;
      case "profile":
        response = await api.getProfile(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: availableActions
        });
    }
    return res.status(200).json({
      success: true,
      action: action,
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[FATAL] ${action}:`, error.message);
    return res.status(500).json({
      success: false,
      action: action,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}