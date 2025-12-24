import axios from "axios";
import qs from "qs";
const API_BASE_URL_NEW = "https://new.nontondrakorid.xyz/api";
const API_BASE_URL_CENTRAL = "https://central.nontondrakorid.xyz/api";
const API_SECRET_KEY_NEW = "ht7argrhnxsgsuxdqpzs1vxx";
const API_SECRET_KEY_CENTRAL = "1184ff3a4f0dd9d";
const COMMON_HEADERS = {
  "User-Agent": "dart/2.17 (DrakorFixApp)",
  "Accept-Encoding": "gzip, deflate, br"
};
class DrakorFixAPI {
  createClient(baseURL) {
    return axios.create({
      baseURL: baseURL,
      headers: COMMON_HEADERS,
      timeout: 15e3
    });
  }
  async req({
    method = "GET",
    baseURL,
    url,
    params = {}
  }) {
    const client = this.createClient(baseURL);
    const reqId = Date.now().toString(36).toUpperCase().slice(-5);
    let finalUrl = `${url}?api_secret_key=${baseURL === API_BASE_URL_CENTRAL ? API_SECRET_KEY_CENTRAL : API_SECRET_KEY_NEW}`;
    if (Object.keys(params).length > 0) {
      finalUrl += `&${qs.stringify(params)}`;
    }
    console.log(`\n[${reqId}] ${method} → ${finalUrl}`);
    try {
      const start = Date.now();
      const response = await client({
        method: method,
        url: finalUrl
      });
      const duration = Date.now() - start;
      console.log(`[${reqId}] Status: ${response.status} | ${duration}ms`);
      return response.data || {};
    } catch (error) {
      console.error(`\n[${reqId}] GAGAL:`, error.message);
      throw {
        status: error.response?.status || 500,
        message: error.message,
        data: error.response?.data || null
      };
    }
  }
  async list_drakor({
    page
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_tvseries_drakor`,
      params: {
        page: page
      }
    });
  }
  async list_drachin({
    page
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_tvseries_drachin`,
      params: {
        page: page
      }
    });
  }
  async list_reality({
    page
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_tvseries_reality`,
      params: {
        page: page
      }
    });
  }
  async list_movie({
    page
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_movies`,
      params: {
        page: page
      }
    });
  }
  async list_series({
    page
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_tvseries`,
      params: {
        page: page
      }
    });
  }
  async get_movie({
    id
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_single_details`,
      params: {
        type: "movie",
        id: id
      }
    });
  }
  async get_series({
    id
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_single_details`,
      params: {
        type: "tvseries",
        id: id
      }
    });
  }
  async search({
    query
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/search_movie_series`,
      params: {
        page: 1,
        q: query
      }
    });
  }
  async by_genre({
    id
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_tvseries_movie_by_genre_id`,
      params: {
        page: 1,
        id: id
      }
    });
  }
  async home() {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/get_slider_2`
    });
  }
  async user_register({
    email,
    password,
    no_hp,
    nama_lengkap,
    onesignal_id
  }) {
    return await this.req({
      baseURL: API_BASE_URL_CENTRAL,
      url: `/signup`,
      params: {
        email: email,
        password: password,
        nomor_handphone: no_hp,
        nama_lengkap: nama_lengkap,
        onesignal_id: onesignal_id
      }
    });
  }
  async user_login({
    email,
    password
  }) {
    return await this.req({
      baseURL: API_BASE_URL_CENTRAL,
      url: `/login`,
      params: {
        email: email,
        password: password
      }
    });
  }
  async get_user({
    user_id
  }) {
    return await this.req({
      baseURL: API_BASE_URL_CENTRAL,
      url: `/get_user_details_by_user_id`,
      params: {
        id: user_id
      }
    });
  }
  async premium() {
    return await this.req({
      baseURL: API_BASE_URL_CENTRAL,
      url: `/paket_premium`
    });
  }
  async suggestions({
    query
  }) {
    return await this.req({
      baseURL: API_BASE_URL_NEW,
      url: `/search_suggest`,
      params: {
        q: query,
        limit: 20
      }
    });
  }
  async app_config() {
    return await this.req({
      baseURL: API_BASE_URL_CENTRAL,
      url: `/get_app_config_5`
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    const availableActions = {
      content_actions: ["home", "premium", "app_config", "list_drakor", "list_drachin", "list_reality", "list_movie", "list_series"],
      detail_actions: ["get_movie", "get_series", "by_genre"],
      search_actions: ["search", "suggestions"],
      user_actions: ["user_login", "user_register", "get_user"]
    };
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi. Contoh: /api/drakorfix?action=list_drakor",
      available_actions: availableActions
    });
  }
  const api = new DrakorFixAPI();
  let response;
  try {
    switch (action) {
      case "home":
      case "premium":
      case "app_config":
      case "list_drakor":
      case "list_drachin":
      case "list_reality":
      case "list_movie":
      case "list_series":
        response = await api[action](params);
        break;
      case "get_movie":
      case "get_series":
      case "by_genre":
        if (!params.id) {
          return res.status(400).json({
            error: `Parameter 'id' wajib diisi untuk action '${action}'.`
          });
        }
        response = await api[action](params);
        break;
      case "search":
      case "suggestions":
        if (!params.query) {
          return res.status(400).json({
            error: `Parameter 'query' wajib diisi untuk action '${action}'.`
          });
        }
        response = await api[action](params);
        break;
      case "user_login":
        if (!params.email || !params.password) {
          return res.status(400).json({
            error: `Parameter 'email' dan 'password' wajib diisi untuk action 'user_login'.`
          });
        }
        response = await api.user_login(params);
        break;
      case "user_register":
        if (!params.email || !params.password || !params.no_hp || !params.nama_lengkap || !params.onesignal_id) {
          const missingParams = [];
          if (!params.email) missingParams.push("email");
          if (!params.password) missingParams.push("password");
          if (!params.no_hp) missingParams.push("no_hp");
          if (!params.nama_lengkap) missingParams.push("nama_lengkap");
          if (!params.onesignal_id) missingParams.push("onesignal_id");
          return res.status(400).json({
            error: `Parameter berikut wajib diisi untuk action 'user_register': ${missingParams.join(", ")}.`
          });
        }
        response = await api.user_register(params);
        break;
      case "get_user":
        if (!params.user_id) {
          return res.status(400).json({
            error: `Parameter 'user_id' wajib diisi untuk action 'get_user'.`
          });
        }
        response = await api.get_user(params);
        break;
      default:
        const availableActions = {
          content_actions: ["home", "premium", "app_config", "list_drakor", "list_drachin", "list_reality", "list_movie", "list_series"],
          detail_actions: ["get_movie", "get_series", "by_genre"],
          search_actions: ["search", "suggestions"],
          user_actions: ["user_login", "user_register", "get_user"]
        };
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          available_actions: availableActions
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(error.status || 500).json({
      error: error.message || "Terjadi kesalahan internal pada server.",
      details: error.data || null
    });
  }
}