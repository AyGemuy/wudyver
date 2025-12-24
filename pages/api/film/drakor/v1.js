import axios from "axios";
import qs from "qs";
class DashDrakorAPI {
  constructor() {
    this.client = axios.create({
      baseURL: "https://dashdrakor.my.id",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "ngeDrakorUA-07072024"
      },
      timeout: 36e3
    });
    this.apiKey = "ngeDrakor-07072024-Release";
    this.token = "4F5A9C3D9A86FA54EACEDDD635185";
  }
  async req({
    method = "GET",
    url,
    data,
    headers = {}
  }) {
    const reqId = Date.now().toString(36).toUpperCase().slice(-5);
    const fullUrl = url.includes("http") ? url : this.client.defaults.baseURL + url;
    console.log(`\n[${reqId}] ${method} → ${url}`);
    if (data && method !== "GET") console.log(`[${reqId}] Payload →`, data);
    try {
      const start = Date.now();
      const response = await this.client({
        method: method,
        url: url,
        data: data && method !== "GET" ? qs.stringify(data) : undefined,
        headers: headers
      });
      const duration = Date.now() - start;
      console.log(`[${reqId}] Status: ${response.status} | ${duration}ms`);
      return response.data || {};
    } catch (error) {
      const duration = Date.now() - (error.config?._start || Date.now());
      throw {
        requestId: reqId,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data || null,
        url: fullUrl
      };
    }
  }
  async genres() {
    return await this.req({
      url: `/data/api/genre/all/${this.token}/${this.apiKey}/`
    });
  }
  async poster(params) {
    return await this.req({
      url: `/data/api/movie/by/${params.id}/${this.token}/${this.apiKey}/`
    });
  }
  async movies({
    genre,
    order = "rating",
    page = 1
  }) {
    return await this.req({
      url: `/data/api/movie/by/filtres/${genre}/${order}/${page}/${this.token}/${this.apiKey}/`
    });
  }
  async series({
    genre,
    order = "rating",
    page = 1
  }) {
    return await this.req({
      url: `/data/api/serie/by/filtres/${genre}/${order}/${page}/${this.token}/${this.apiKey}/`
    });
  }
  async posters({
    genre,
    order = "rating",
    page = 1
  }) {
    return await this.req({
      url: `/data/api/poster/by/filtres/${genre}/${order}/${page}/${this.token}/${this.apiKey}/`
    });
  }
  async random({
    genre: genres
  }) {
    return await this.req({
      url: `/data/api/movie/random/${genres}/${this.token}/${this.apiKey}/`
    });
  }
  async search(params) {
    return await this.req({
      url: `/data/api/search/${encodeURIComponent(params.query)}/${this.token}/${this.apiKey}/`
    });
  }
  async home() {
    return await this.req({
      url: `/data/api/first/${this.token}/${this.apiKey}/?ongoings=true`
    });
  }
  async actors({
    page = 1,
    search = ""
  }) {
    return await this.req({
      url: `/api/actor/all/${page}/${encodeURIComponent(search)}/${this.token}/${this.apiKey}/`
    });
  }
  async get_actor(params) {
    return await this.req({
      url: `/api/movie/by/actor/${params.id}/${this.token}/${this.apiKey}/`
    });
  }
  async roles(params) {
    return await this.req({
      url: `/api/role/by/poster/${params.id}/${this.token}/${this.apiKey}/`
    });
  }
  async seasons(params) {
    return await this.req({
      url: `/data/api/season/by/serie/${params.id}/${this.token}/${this.apiKey}/`
    });
  }
  async get_comment(params) {
    return await this.req({
      url: `/comment/${params.id}/`
    });
  }
  async get_room(params) {
    return await this.req({
      url: `/rooms/details/${params.code}`
    });
  }
  async add_episode(params) {
    return await this.req({
      method: "POST",
      url: `/api/episode/add/view/${this.token}/${this.apiKey}/`,
      data: {
        id: params.id
      }
    });
  }
  async add_movie(params) {
    return await this.req({
      method: "POST",
      url: `/api/movie/add/view/${this.token}/${this.apiKey}/`,
      data: {
        id: params.id
      }
    });
  }
  async recent_ranking() {
    return await this.req({
      method: "POST",
      url: `/recent-ranking/${this.apiKey}/`
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
      content_actions: ["genres", "home", "actors", "recent_ranking"],
      detail_actions: ["poster", "get_actor", "roles", "seasons", "get_comment", "add_episode", "add_movie"],
      search_actions: ["search"],
      room_actions: ["get_room"],
      genre_based_actions: ["series", "movies", "posters", "random"]
    };
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      available_actions: availableActions
    });
  }
  const api = new DashDrakorAPI();
  let response;
  try {
    switch (action) {
      case "genres":
      case "home":
      case "actors":
      case "recent_ranking":
        response = await api[action](params);
        break;
      case "poster":
      case "get_actor":
      case "roles":
      case "seasons":
      case "get_comment":
      case "add_episode":
      case "add_movie":
        if (!params.id) {
          return res.status(400).json({
            error: `Parameter 'id' wajib diisi untuk action '${action}'.`
          });
        }
        response = await api[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Parameter 'query' wajib diisi untuk action 'search'.`
          });
        }
        response = await api.search(params);
        break;
      case "get_room":
        if (!params.code) {
          return res.status(400).json({
            error: `Parameter 'code' wajib diisi untuk action 'get_room'.`
          });
        }
        response = await api.get_room(params);
        break;
      case "series":
      case "movies":
      case "posters":
      case "random":
        if (!params.genre) {
          return res.status(400).json({
            error: `Parameter 'genre' wajib diisi untuk action '${action}'.`
          });
        }
        response = await api[action](params);
        break;
      default:
        const availableActions = {
          content_actions: ["genres", "home", "actors", "recent_ranking"],
          detail_actions: ["poster", "get_actor", "roles", "seasons", "get_comment", "add_episode", "add_movie"],
          search_actions: ["search"],
          room_actions: ["get_room"],
          genre_based_actions: ["series", "movies", "posters", "random"]
        };
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          available_actions: availableActions
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || "Terjadi kesalahan internal pada server.",
      details: error.data || null
    });
  }
}