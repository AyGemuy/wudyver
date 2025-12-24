import axios from "axios";
class Drachin {
  constructor() {
    this.client = axios.create({
      baseURL: "https://android2024.my.id/stream/drachin/masterstream/api/",
      headers: {
        "User-Agent": "Android News App",
        "Data-Agent": "Android News App",
        "Cache-Control": "max-age=0"
      },
      params: {
        api_key: "cda11X92DgQqm6WaBuL4EconwZ7Aezi0F3rYKtjCSN1fsTV8Hl"
      }
    });
  }
  async _req(endpoint, params = {}) {
    try {
      const {
        data
      } = await this.client.get("api.php", {
        params: {
          [endpoint]: "",
          ...params
        }
      });
      return data;
    } catch (error) {
      console.error(`[ERR GET] ${endpoint}:`, error.message);
      return null;
    }
  }
  async recent({
    page = 1,
    count = 10
  } = {}) {
    return await this._req("get_recent_posts", {
      page: page,
      count: count
    });
  }
  async videos({
    page = 1,
    count = 10
  } = {}) {
    return await this._req("get_video_posts", {
      page: page,
      count: count
    });
  }
  async categories() {
    return await this._req("get_category_index");
  }
  async category({
    id,
    page = 1,
    count = 10
  } = {}) {
    return await this._req("get_category_posts", {
      id: id,
      page: page,
      count: count
    });
  }
  async detail({
    id
  } = {}) {
    return await this._req("get_news_detail", {
      id: id
    });
  }
  async search({
    query,
    page = 1,
    count = 10
  } = {}) {
    return await this._req("get_search_results", {
      search: query,
      page: page,
      count: count
    });
  }
  async search_rtl({
    query,
    page = 1,
    count = 10
  } = {}) {
    return await this._req("get_search_results_rtl", {
      search: query,
      page: page,
      count: count
    });
  }
  async comments({
    id
  } = {}) {
    return await this._req("get_comments", {
      nid: id
    });
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const allowedActions = ["recent", "videos", "categories", "category", "detail", "search", "search_rtl", "comments"];
    if (!action) {
      return res.status(400).json({
        error: "Missing required field: action",
        allowed: allowedActions
      });
    }
    const api = new Drachin();
    let result;
    switch (action) {
      case "recent":
        result = await api.recent(params);
        break;
      case "videos":
        result = await api.videos(params);
        break;
      case "categories":
        result = await api.categories();
        break;
      case "category":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await api.category(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await api.detail(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await api.search(params);
        break;
      case "search_rtl":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await api.search_rtl(params);
        break;
      case "comments":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await api.comments(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          allowed: allowedActions
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Handler Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      code: 500
    });
  }
}