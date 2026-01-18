import axios from "axios";
const CONFIG = {
  API_KEY: "7a56ed7a117d0b58f841f827314fa95d927kdjn0okdkndjaebdndwkamvnfjdltdk",
  URLS: {
    PRIMARY: "https://service-drama.apistpdrama.my.id/api/drama",
    SECONDARY: "https://service-detail-drama.apistpdrama.my.id/api/drama",
    TERTIARY: "https://api.tertiary.com",
    QUATERNARY: "https://apihistory.my.id/api/mobile",
    SEARCH: "https://service-search.apistpdrama.my.id",
    DONGHUA: "https://servicedonghua.my.id/api/donghua"
  }
};
class DramaQueenApi {
  constructor() {
    this.axios = axios.create({
      timeout: 2e4,
      headers: {
        "X-API-KEY": CONFIG.API_KEY,
        "Content-Type": "application/json"
      },
      validateStatus: status => status < 500
    });
  }
  async _req(method, path, urlType = "PRIMARY", params = null) {
    const baseURL = CONFIG.URLS[urlType];
    const url = `${baseURL}${path}`;
    try {
      console.log(`[PROSES] ${method} [${urlType}] ${path}`);
      const response = await this.axios.request({
        method: method,
        url: url,
        params: params
      });
      console.log(`[SUKSES] ${method} [${urlType}] ${path} - Status: ${response.status}`);
      return response.data;
    } catch (e) {
      console.error(`[ERROR] ${method} [${urlType}] ${path} - Msg: ${e.message}`);
      throw e;
    }
  }
  async upcoming({
    limit = 20,
    ...rest
  }) {
    const params = {
      limit: limit
    };
    return await this._req("GET", "/upcoming", "PRIMARY", params);
  }
  async list({
    page = 1,
    limit = 12,
    ...rest
  }) {
    const params = {
      page: page,
      limit: limit
    };
    return await this._req("GET", "/list", "PRIMARY", params);
  }
  async by_genre({
    genre,
    page = 1,
    ...rest
  }) {
    const params = {
      page: page,
      limit: 9
    };
    if (genre) {
      params.genre = genre;
    }
    return await this._req("GET", "/list", "PRIMARY", params);
  }
  async recommend() {
    return await this._req("GET", "/rekomendasi", "PRIMARY");
  }
  async actors({
    page = 1,
    is_born,
    nationality,
    search,
    ...rest
  }) {
    const params = {
      page: page,
      limit: 20
    };
    if (is_born) {
      params.isBorn = is_born;
    }
    if (nationality) {
      params.nationality = nationality;
    }
    if (search) {
      params.search = search;
    }
    return await this._req("GET", "/list-aktor", "PRIMARY", params);
  }
  async detail({
    id,
    ...rest
  }) {
    return await this._req("GET", `/detail/${id}`, "SECONDARY");
  }
  async ep_detail({
    id,
    ...rest
  }) {
    return await this._req("GET", `/episode/${id}`, "SECONDARY");
  }
  async related({
    id,
    ...rest
  }) {
    return await this._req("GET", `/related/${id}`, "SECONDARY");
  }
  async actor_detail({
    id,
    ...rest
  }) {
    return await this._req("GET", `/aktor-detail/${id}`, "SECONDARY");
  }
  async history({
    user_id,
    ...rest
  }) {
    const params = {
      status: "Watching",
      limit: 16
    };
    if (user_id) {
      params.user_id = user_id;
    }
    return await this._req("GET", "/list-history", "QUATERNARY", params);
  }
  async popular() {
    return await this._req("GET", "/populer", "SEARCH");
  }
  async search({
    query,
    ...rest
  }) {
    const params = {};
    if (query) {
      params.q = query;
    }
    return await this._req("GET", "/search", "SEARCH", params);
  }
  async filter({
    page = 1,
    limit = 24,
    genre,
    year,
    country,
    type,
    ...rest
  }) {
    const params = {
      page: page,
      limit: limit
    };
    if (genre) params.genre = genre;
    if (year) params.tahun_rilis = year;
    if (country) params.negara = country;
    if (type) params.type = type;
    return await this._req("GET", "/filter-drama", "SEARCH", params);
  }
  async stats() {
    const params = {
      period: "daily",
      limit: 10
    };
    return await this._req("GET", "/search-stats", "SEARCH", params);
  }
  async dh_list({
    page = 1,
    ...rest
  }) {
    const params = {
      page: page,
      limit: 9
    };
    return await this._req("GET", "/", "DONGHUA", params);
  }
  async dh_detail({
    id,
    ...rest
  }) {
    return await this._req("GET", `/${id}`, "DONGHUA");
  }
  async dh_popular() {
    return await this._req("GET", "/populer", "DONGHUA");
  }
  async dh_ep({
    id,
    ep,
    ...rest
  }) {
    const params = {};
    if (ep) {
      params.episode = ep;
    }
    return await this._req("GET", `/${id}`, "DONGHUA", params);
  }
  async dh_search({
    query,
    ...rest
  }) {
    const params = {};
    if (query) {
      params.query = query;
    }
    return await this._req("GET", "/search", "DONGHUA", params);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const valid_actions = ["upcoming", "list", "by_genre", "recommend", "actors", "detail", "ep_detail", "related", "actor_detail", "history", "popular", "search", "filter", "stats", "dh_list", "dh_detail", "dh_popular", "dh_ep", "dh_search"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: valid_actions
    });
  }
  const api = new DramaQueenApi();
  try {
    let response;
    console.log(`[HANDLER] Action: ${action}`);
    switch (action) {
      case "upcoming":
        response = await api.upcoming(params);
        break;
      case "list":
        response = await api.list(params);
        break;
      case "by_genre":
        if (!params.genre) {
          return res.status(400).json({
            error: "Parameter 'genre' wajib."
          });
        }
        response = await api.by_genre(params);
        break;
      case "recommend":
        response = await api.recommend();
        break;
      case "actors":
        response = await api.actors(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.detail(params);
        break;
      case "ep_detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.ep_detail(params);
        break;
      case "related":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.related(params);
        break;
      case "actor_detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.actor_detail(params);
        break;
      case "history":
        if (!params.user_id) {
          return res.status(400).json({
            error: "Parameter 'user_id' wajib."
          });
        }
        response = await api.history(params);
        break;
      case "popular":
        response = await api.popular();
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib."
          });
        }
        response = await api.search(params);
        break;
      case "filter":
        response = await api.filter(params);
        break;
      case "stats":
        response = await api.stats();
        break;
      case "dh_list":
        response = await api.dh_list(params);
        break;
      case "dh_detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib."
          });
        }
        response = await api.dh_detail(params);
        break;
      case "dh_popular":
        response = await api.dh_popular();
        break;
      case "dh_ep":
        if (!params.id || !params.ep) {
          return res.status(400).json({
            error: "Parameter 'id' dan 'ep' wajib."
          });
        }
        response = await api.dh_ep(params);
        break;
      case "dh_search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib."
          });
        }
        response = await api.dh_search(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: valid_actions
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}