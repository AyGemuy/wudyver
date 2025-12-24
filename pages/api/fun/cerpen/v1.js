import axios from "axios";
class CerpendiaAPI {
  constructor() {
    this.base = "https://cerpendia.dikatekno.com/api";
    this.key = "cda11sNOJRB7Vkr2d40zZfubMDIQUmYFohGaqtny98XSiC1xHK";
    this.client = axios.create({
      baseURL: `${this.base}/api.php`,
      headers: {
        "Cache-Control": "max-age=0",
        "Data-Agent": "Android News App"
      },
      timeout: 3e4
    });
  }
  log(msg, data = null) {
    console.log(`[CerpendiaAPI] ${msg}`, data || "");
  }
  async category({
    ...rest
  } = {}) {
    try {
      this.log("Fetching categories...");
      const {
        data
      } = await this.client.get("", {
        params: {
          get_category_index: "",
          api_key: this.key,
          ...rest
        }
      });
      this.log("Categories fetched", data?.count || 0);
      return data?.data ?? data;
    } catch (err) {
      this.log("Error fetching categories", err?.message);
      throw err;
    }
  }
  async category_posts({
    id,
    page = 1,
    count = 10,
    ...rest
  } = {}) {
    try {
      this.log(`Fetching category posts (id: ${id}, page: ${page})...`);
      const {
        data
      } = await this.client.get("", {
        params: {
          get_category_posts: "",
          id: id,
          api_key: this.key,
          page: page,
          count: count,
          ...rest
        }
      });
      this.log("Category posts fetched", data?.count || 0);
      return data?.data ?? data;
    } catch (err) {
      this.log("Error fetching category posts", err?.message);
      throw err;
    }
  }
  async recent({
    page = 1,
    count = 10,
    ...rest
  } = {}) {
    try {
      this.log(`Fetching recent posts (page: ${page})...`);
      const {
        data
      } = await this.client.get("", {
        params: {
          get_recent_posts: "",
          api_key: this.key,
          page: page,
          count: count,
          ...rest
        }
      });
      this.log("Recent posts fetched", data?.count || 0);
      return data?.data ?? data;
    } catch (err) {
      this.log("Error fetching recent posts", err?.message);
      throw err;
    }
  }
  async detail({
    id,
    ...rest
  } = {}) {
    try {
      this.log(`Fetching post detail (id: ${id})...`);
      const {
        data
      } = await this.client.get("", {
        params: {
          get_news_detail: "",
          id: id,
          ...rest
        }
      });
      this.log("Post detail fetched", data?.status);
      return data?.data ?? data;
    } catch (err) {
      this.log("Error fetching post detail", err?.message);
      throw err;
    }
  }
  async comments({
    nid,
    ...rest
  } = {}) {
    try {
      this.log(`Fetching comments (nid: ${nid})...`);
      const {
        data
      } = await this.client.get("", {
        params: {
          get_comments: "",
          nid: nid,
          ...rest
        }
      });
      this.log("Comments fetched", data?.count || 0);
      return data?.data ?? data;
    } catch (err) {
      this.log("Error fetching comments", err?.message);
      throw err;
    }
  }
  async search({
    q,
    page = 1,
    count = 10,
    rtl = false,
    ...rest
  } = {}) {
    try {
      this.log(`Searching posts (q: ${q}, page: ${page}, rtl: ${rtl})...`);
      const endpoint = rtl ? "get_search_results_rtl" : "get_search_results";
      const {
        data
      } = await this.client.get("", {
        params: {
          [endpoint]: "",
          api_key: this.key,
          search: q,
          page: page,
          count: count,
          ...rest
        }
      });
      this.log("Search results fetched", data?.count || 0);
      return data?.data ?? data;
    } catch (err) {
      this.log("Error searching posts", err?.message);
      throw err;
    }
  }
  async video({
    page = 1,
    count = 10,
    ...rest
  } = {}) {
    try {
      this.log(`Fetching video posts (page: ${page})...`);
      const {
        data
      } = await this.client.get("", {
        params: {
          get_video_posts: "",
          api_key: this.key,
          page: page,
          count: count,
          ...rest
        }
      });
      this.log("Video posts fetched", data?.count || 0);
      return data?.data ?? data;
    } catch (err) {
      this.log("Error fetching video posts", err?.message);
      throw err;
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
      actions: ["category", "category_posts", "recent", "detail", "comments", "search", "video"]
    });
  }
  const api = new CerpendiaAPI();
  try {
    let response;
    switch (action) {
      case "category":
        response = await api.category(params);
        break;
      case "category_posts":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'category_posts'."
          });
        }
        response = await api.category_posts(params);
        break;
      case "recent":
        response = await api.recent(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "comments":
        if (!params.nid) {
          return res.status(400).json({
            error: "Parameter 'nid' wajib diisi untuk action 'comments'."
          });
        }
        response = await api.comments(params);
        break;
      case "search":
        if (!params.q) {
          return res.status(400).json({
            error: "Parameter 'q' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "video":
        response = await api.video(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["category", "category_posts", "recent", "detail", "comments", "search", "video"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}