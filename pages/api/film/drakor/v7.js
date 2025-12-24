import axios from "axios";
const BASE_URL = "https://api.drakor.la/v2";
const DEFAULT_HEADERS = {
  "User-Agent": "Dart/3.9 (dart:io)",
  Accept: "application/json",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json",
  "x-app-package": "net.drakorid.app",
  "x-app-version": "7.2",
  platform: "Mobile"
};
const rand_str = len => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
const rand_email = () => {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "mail.com"];
  return `${rand_str(8)}@${domains[Math.floor(Math.random() * domains.length)]}`;
};
const rand_name = () => {
  const prefixes = ["user", "drakor", "fan", "watch", "stream"];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + rand_str(6);
};
const rand_pass = () => rand_str(10);
const rand_gender = () => Math.random() > .5 ? "Pria" : "Wanita";
class DrakorLaAPI {
  constructor() {
    this.token = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: DEFAULT_HEADERS,
      timeout: 15e3
    });
  }
  async ensureToken(token = null) {
    if (this.isInitialized && this.token) {
      return this.token;
    }
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }
    this.initializationPromise = this.auto_init({
      token: token
    });
    try {
      const result = await this.initializationPromise;
      this.isInitialized = true;
      return this.token;
    } finally {
      this.initializationPromise = null;
    }
  }
  async req({
    method = "GET",
    url,
    data = null,
    token = null,
    autoInit = true
  }) {
    const reqId = Date.now().toString(36).toUpperCase().slice(-5);
    console.log(`\n[${reqId}] ${method} → ${url}`);
    let useToken = token || this.token;
    if (autoInit && !useToken) {
      useToken = await this.ensureToken(token);
    }
    const config = {
      method: method,
      url: url,
      headers: {
        ...DEFAULT_HEADERS
      }
    };
    if (useToken) {
      config.headers["authorization"] = useToken;
    }
    if (method === "POST" && data) {
      config.data = JSON.stringify(data);
      console.log(`[${reqId}] Payload →`, data);
    }
    try {
      const start = Date.now();
      const response = await this.client(config);
      const duration = Date.now() - start;
      console.log(`[${reqId}] Status: ${response.status} | ${duration}ms`);
      return response.data || {};
    } catch (error) {
      console.error(`\n[${reqId}] GAGAL:`, error.message);
      if (autoInit && error.response?.status === 401 && useToken) {
        console.log(`[${reqId}] Token invalid, attempting auto-init...`);
        this.token = null;
        this.isInitialized = false;
        useToken = await this.ensureToken();
        config.headers["authorization"] = useToken;
        const retryResponse = await this.client(config);
        return retryResponse.data || {};
      }
      throw {
        status: error.response?.status || 500,
        message: error.message,
        data: error.response?.data || null
      };
    }
  }
  async auto_init({
    token = null,
    name = null,
    email = null,
    password = null,
    gender = null
  } = {}) {
    try {
      if (token) {
        console.log("🔑 Validasi token...");
        const userInfo = await this.user_info({
          token: token,
          autoInit: false
        });
        await this.save_fcm({
          token: token,
          autoInit: false
        });
        this.token = token;
        return {
          success: true,
          token: token,
          userData: userInfo.data,
          isNew: false
        };
      }
      console.log("🆕 Auto register...");
      const regResult = await this.register({
        name: name,
        email: email,
        password: password,
        gender: gender,
        autoInit: false
      });
      const userInfo = await this.user_info({
        token: regResult.token,
        autoInit: false
      });
      await this.save_fcm({
        token: regResult.token,
        autoInit: false
      });
      this.token = regResult.token;
      return {
        success: true,
        token: regResult.token,
        credentials: regResult.credentials,
        userData: userInfo.data,
        isNew: true
      };
    } catch (error) {
      console.error("❌ Error:", error.message);
      throw error;
    }
  }
  async register({
    name = null,
    email = null,
    password = null,
    gender = null,
    token = null,
    autoInit = true
  } = {}) {
    const data = {
      name: name || rand_name(),
      email: email || rand_email(),
      password: password || rand_pass(),
      gender: gender || rand_gender(),
      provider: "net.drakorid.app"
    };
    console.log("📝 Registrasi:", data);
    const res = await this.req({
      method: "POST",
      url: "/users/register",
      data: data,
      token: token,
      autoInit: autoInit
    });
    if (res.status === 1 && res.data?.jwt_token) {
      const newToken = res.data.jwt_token;
      console.log("✅ Token:", newToken.substring(0, 50) + "...");
      return {
        success: true,
        token: newToken,
        credentials: data,
        response: res
      };
    }
    throw new Error("Register gagal");
  }
  async user_info({
    token = null,
    autoInit = true
  } = {}) {
    const res = await this.req({
      method: "GET",
      url: "/users/info",
      token: token,
      autoInit: autoInit
    });
    if (res.status === 1) {
      console.log("✅ User:", res.data?.name, `(ID: ${res.data?.id})`);
      return res;
    }
    throw new Error("Get user info gagal");
  }
  async save_fcm({
    token = null,
    fcm_token = "",
    device_id = rand_pass(),
    autoInit = true
  } = {}) {
    return await this.req({
      method: "POST",
      url: "/users/save-fcm-token",
      data: {
        token: fcm_token,
        provider: "net.drakorid.app",
        device_id: device_id
      },
      token: token,
      autoInit: autoInit
    });
  }
  async slider({
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: "/movies/slider",
      token: token
    });
  }
  async latest({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/latest?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async ongoing({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/ongoing?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async trending({
    page = 1,
    limit = 30,
    days = 1,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/trending?page=${page}&limit=${limit}&days=${days}`,
      token: token
    });
  }
  async variety_show({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/index/variety-show?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async by_genre({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/index/by-genre?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async by_artist({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/index/by-artist?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async origin_drama({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/index/origin-drama?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async origin_film({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/index/origin-film?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async recommended({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/index/recommended?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async history({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/history?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async latest_on1({
    page = 1,
    limit = 30,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/latest-on1?page=${page}&limit=${limit}`,
      token: token
    });
  }
  async search({
    q,
    page = 1,
    limit = 30,
    type = 1,
    order = 1,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/movies/search?page=${page}&q=${q}&limit=${limit}&type=${type}&order=${order}`,
      token: token
    });
  }
  async get_info({
    id,
    token = null
  }) {
    return await this.req({
      method: "GET",
      url: `/movies/get-info?id=${id}`,
      token: token
    });
  }
  async is_fav({
    id,
    token = null
  }) {
    return await this.req({
      method: "GET",
      url: `/movies/fav/is-fav?id=${id}`,
      token: token
    });
  }
  async get_episodes({
    id,
    token = null
  }) {
    return await this.req({
      method: "GET",
      url: `/movies/get-episodes?id=${id}`,
      token: token
    });
  }
  async download_link({
    streaming,
    movie_id,
    episode_number,
    token = null
  }) {
    return await this.req({
      method: "GET",
      url: `/generate-link/download-lite?streaming=${streaming}&movie_id=${movie_id}&episode_number=${episode_number}`,
      token: token
    });
  }
  async get_artists({
    page = 1,
    limit = 30,
    sort = "HITS",
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/artist/get-for-index?page=${page}&limit=${limit}&sort=${sort}`,
      token: token
    });
  }
  async artist_list({
    movie_id,
    token = null
  }) {
    return await this.req({
      method: "GET",
      url: `/artist/get-list?movie_id=${movie_id}`,
      token: token
    });
  }
  async get_osts({
    page = 1,
    limit = 30,
    sort = "HITS",
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/ost/get-all?page=${page}&limit=${limit}&sort=${sort}`,
      token: token
    });
  }
  async categories({
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: "/category/get-with-stats",
      token: token
    });
  }
  async comment_count({
    movie_id,
    token = null
  }) {
    return await this.req({
      method: "GET",
      url: `/komentar/count?movie_id=${movie_id}`,
      token: token
    });
  }
  async get_comments({
    movie_id,
    page = 1,
    sort = 2,
    token = null
  } = {}) {
    return await this.req({
      method: "GET",
      url: `/komentar/get?page=${page}&movie_id=${movie_id}&sort=${sort}`,
      token: token
    });
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
      available_actions: {
        user_actions: ["auto_init", "register", "user_info", "save_fcm"],
        content_actions: ["slider", "latest", "ongoing", "trending", "variety_show", "by_genre", "by_artist", "origin_drama", "origin_film", "recommended", "history", "latest_on1", "categories"],
        search_actions: ["search"],
        detail_actions: ["get_info", "is_fav", "get_episodes", "artist_list", "comment_count"],
        media_actions: ["download_link", "get_comments", "get_artists", "get_osts"]
      }
    });
  }
  const api = new DrakorLaAPI();
  let response;
  try {
    switch (action) {
      case "auto_init":
      case "register":
      case "user_info":
      case "save_fcm":
        response = await api[action](params);
        break;
      case "slider":
      case "latest":
      case "ongoing":
      case "trending":
      case "variety_show":
      case "by_genre":
      case "by_artist":
      case "origin_drama":
      case "origin_film":
      case "recommended":
      case "history":
      case "latest_on1":
      case "categories":
        response = await api[action](params);
        break;
      case "search":
        if (!params.q) {
          return res.status(400).json({
            error: "Parameter 'q' wajib untuk search"
          });
        }
        response = await api.search(params);
        break;
      case "get_info":
      case "is_fav":
      case "get_episodes":
      case "artist_list":
      case "comment_count":
        if (!params.id && !params.movie_id) {
          return res.status(400).json({
            error: `Parameter 'id' atau 'movie_id' wajib untuk ${action}`
          });
        }
        response = await api[action](params);
        break;
      case "download_link":
        if (!params.streaming || !params.movie_id || !params.episode_number) {
          return res.status(400).json({
            error: "Parameter 'streaming', 'movie_id', 'episode_number' wajib"
          });
        }
        response = await api.download_link(params);
        break;
      case "get_comments":
        if (!params.movie_id) {
          return res.status(400).json({
            error: "Parameter 'movie_id' wajib"
          });
        }
        response = await api.get_comments(params);
        break;
      case "get_artists":
      case "get_osts":
        response = await api[action](params);
        break;
      default:
        const availableActions = {
          user_actions: ["auto_init", "register", "user_info", "save_fcm"],
          content_actions: ["slider", "latest", "ongoing", "trending", "variety_show", "by_genre", "by_artist", "origin_drama", "origin_film", "recommended", "history", "latest_on1", "categories"],
          search_actions: ["search"],
          detail_actions: ["get_info", "is_fav", "get_episodes", "artist_list", "comment_count"],
          media_actions: ["download_link", "get_comments", "get_artists", "get_osts"]
        };
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          available_actions: availableActions,
          suggestion: "Gunakan salah satu action yang tersedia di atas"
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL] Action '${action}':`, error);
    return res.status(error.status || 500).json({
      error: error.message || "Internal server error",
      details: error.data || null
    });
  }
}