import axios from "axios";
import qs from "qs";
const BASE_URL_DRAKORID = "https://wincamp.web.id/drakor/phalcon/api";
const DEFAULT_HEADERS = {
  "User-Agent": "okhttp/3.10.0",
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/x-www-form-urlencoded",
  "Cache-Control": "max-age=0",
  "Data-Agent": "Drakor ID v1.8/10"
};
const DEFAULT_POST_DATA = {
  isAPKvalid: "true"
};
class DrakorIDAPI {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL_DRAKORID,
      headers: DEFAULT_HEADERS,
      timeout: 15e3
    });
  }
  async req({
    method = "GET",
    url,
    data = {}
  }) {
    const reqId = Date.now().toString(36).toUpperCase().slice(-5);
    console.log(`\n[${reqId}] ${method} → ${url}`);
    if (method === "POST") {
      const finalData = url.includes("update_view") && Object.keys(data).length === 1 && data.channel_id ? data : {
        ...DEFAULT_POST_DATA,
        ...data
      };
      console.log(`[${reqId}] Payload →`, finalData);
      try {
        const start = Date.now();
        const response = await this.client({
          method: method,
          url: url,
          data: qs.stringify(finalData)
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
    } else {
      try {
        const start = Date.now();
        const response = await this.client({
          method: method,
          url: url,
          params: data
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
  }
  async new_posts({
    page = 1,
    count = 20
  }) {
    return await this.req({
      method: "POST",
      url: `/get_new_posts_drakor/v2/`,
      data: {
        page: page,
        count: count
      }
    });
  }
  async ongoing({
    page = 1,
    count = 200
  }) {
    return await this.req({
      method: "POST",
      url: `/get_category_ongoing_drakor/v2/`,
      data: {
        page: page,
        count: count
      }
    });
  }
  async search({
    pilihan = "Serial Drama",
    query,
    page = 1,
    count = 20
  }) {
    return await this.req({
      method: "POST",
      url: `/search_category_collection/v2/`,
      data: {
        pilihan: pilihan,
        search: query,
        page: page,
        count: count
      }
    });
  }
  async categories() {
    return await this.req({
      method: "GET",
      url: `/get_category_type_list/v2/`
    });
  }
  async get_category(params) {
    return await this.req({
      method: "POST",
      url: `/get_category_posts_drakor/v2/`,
      data: params
    });
  }
  async get_post(params) {
    return await this.req({
      method: "POST",
      url: `/get_post_description_drakor/v2/`,
      data: params
    });
  }
  async get_related(params) {
    return await this.req({
      method: "POST",
      url: `/get_current_next_previous/v2/`,
      data: params
    });
  }
  async update_view(params) {
    return await this.req({
      method: "POST",
      url: `/update_view/v2/`,
      data: params
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
      content_actions: ["new_posts", "ongoing", "categories"],
      search_actions: ["search"],
      category_actions: ["get_category"],
      post_actions: ["get_post", "update_view", "get_related"]
    };
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      available_actions: availableActions
    });
  }
  const api = new DrakorIDAPI();
  let response;
  try {
    switch (action) {
      case "new_posts":
      case "ongoing":
      case "categories":
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
      case "get_category":
        if (!params.id) {
          return res.status(400).json({
            error: `Parameter 'id' wajib diisi untuk action 'get_category'.`
          });
        }
        response = await api.get_category(params);
        break;
      case "get_post":
      case "update_view":
        if (!params.channel_id) {
          return res.status(400).json({
            error: `Parameter 'channel_id' wajib diisi untuk action '${action}'.`
          });
        }
        response = await api[action](params);
        break;
      case "get_related":
        if (!params.channel_id || !params.category_id) {
          const missingParams = [];
          if (!params.channel_id) missingParams.push("channel_id");
          if (!params.category_id) missingParams.push("category_id");
          return res.status(400).json({
            error: `Parameter berikut wajib diisi untuk action 'get_related': ${missingParams.join(", ")}.`
          });
        }
        response = await api.get_related(params);
        break;
      default:
        const availableActions = {
          content_actions: ["new_posts", "ongoing", "categories"],
          search_actions: ["search"],
          category_actions: ["get_category"],
          post_actions: ["get_post", "update_view", "get_related"]
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