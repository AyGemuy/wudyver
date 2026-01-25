import axios from "axios";
import ApiKey from "@/configs/api-key";
class Unsplash {
  constructor() {
    this.apikey = ApiKey.unsplash;
    this.base_url = "https://api.unsplash.com";
  }
  async req(method, endpoint, params = {}, data = {}) {
    let last_error = null;
    for (const key of this.apikey) {
      try {
        console.log(`[REQ] ${method} ${endpoint} | Key: ...${key?.slice(-4) || "None"}`);
        const headers = {
          Authorization: key ? `Client-ID ${key}` : "",
          "Accept-Version": "v1",
          "Content-Type": "application/json"
        };
        const response = await axios({
          method: method,
          url: `${this.base_url}${endpoint}`,
          headers: headers,
          params: method === "GET" ? params : {},
          data: method !== "GET" ? data : {}
        });
        return response?.data || null;
      } catch (error) {
        const msg = error?.response?.data?.errors?.[0] || error?.message || "Unknown Error";
        console.error(`[FAIL] Key ...${key?.slice(-4)} failed: ${msg}`);
        last_error = error;
      }
    }
    console.error("[FATAL] All API keys exhausted.");
    throw last_error;
  }
  async me() {
    try {
      console.log("[LOG] Fetching current user profile...");
      return await this.req("GET", "/me");
    } catch (e) {
      throw e;
    }
  }
  async update_me(body = {}) {
    try {
      console.log("[LOG] Updating current user profile...");
      return await this.req("PUT", "/me", {}, body);
    } catch (e) {
      throw e;
    }
  }
  async user({
    username
  }) {
    try {
      console.log(`[LOG] Fetching user: ${username}`);
      return await this.req("GET", `/users/${username}`);
    } catch (e) {
      throw e;
    }
  }
  async user_portfolio({
    username
  }) {
    try {
      console.log(`[LOG] Fetching portfolio for: ${username}`);
      return await this.req("GET", `/users/${username}/portfolio`);
    } catch (e) {
      throw e;
    }
  }
  async user_photos({
    username,
    page = 1,
    per_page = 10,
    order_by = "latest",
    ...rest
  }) {
    try {
      console.log(`[LOG] Fetching photos for user: ${username}`);
      return await this.req("GET", `/users/${username}/photos`, {
        page: page,
        per_page: per_page,
        order_by: order_by,
        ...rest
      });
    } catch (e) {
      throw e;
    }
  }
  async user_likes({
    username,
    page = 1,
    per_page = 10,
    ...rest
  }) {
    try {
      console.log(`[LOG] Fetching likes for user: ${username}`);
      return await this.req("GET", `/users/${username}/likes`, {
        page: page,
        per_page: per_page,
        ...rest
      });
    } catch (e) {
      throw e;
    }
  }
  async user_collections({
    username,
    page = 1,
    per_page = 10
  }) {
    try {
      console.log(`[LOG] Fetching collections for user: ${username}`);
      return await this.req("GET", `/users/${username}/collections`, {
        page: page,
        per_page: per_page
      });
    } catch (e) {
      throw e;
    }
  }
  async user_stats({
    username,
    resolution = "days",
    quantity = 30
  }) {
    try {
      console.log(`[LOG] Fetching stats for user: ${username}`);
      return await this.req("GET", `/users/${username}/statistics`, {
        resolution: resolution,
        quantity: quantity
      });
    } catch (e) {
      throw e;
    }
  }
  async photos({
    page = 1,
    per_page = 10,
    order_by = "latest"
  }) {
    try {
      console.log("[LOG] Fetching photos list...");
      return await this.req("GET", "/photos", {
        page: page,
        per_page: per_page,
        order_by: order_by
      });
    } catch (e) {
      throw e;
    }
  }
  async photo({
    id
  }) {
    try {
      console.log(`[LOG] Fetching photo ID: ${id}`);
      return await this.req("GET", `/photos/${id}`);
    } catch (e) {
      throw e;
    }
  }
  async random_photo(params = {}) {
    try {
      console.log("[LOG] Fetching random photo...");
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
      return await this.req("GET", "/photos/random", params);
    } catch (e) {
      throw e;
    }
  }
  async photo_stats({
    id,
    resolution = "days",
    quantity = 30
  }) {
    try {
      console.log(`[LOG] Fetching stats for photo ID: ${id}`);
      return await this.req("GET", `/photos/${id}/statistics`, {
        resolution: resolution,
        quantity: quantity
      });
    } catch (e) {
      throw e;
    }
  }
  async track_download({
    id
  }) {
    try {
      console.log(`[LOG] Tracking download for ID: ${id}`);
      return await this.req("GET", `/photos/${id}/download`);
    } catch (e) {
      throw e;
    }
  }
  async update_photo({
    id,
    ...body
  }) {
    try {
      console.log(`[LOG] Updating photo ID: ${id}`);
      return await this.req("PUT", `/photos/${id}`, {}, body);
    } catch (e) {
      throw e;
    }
  }
  async search_photos({
    query,
    page = 1,
    per_page = 10,
    order_by = "relevant",
    ...rest
  }) {
    try {
      if (!query) throw new Error("Query is required");
      console.log(`[LOG] Searching photos: "${query}"`);
      return await this.req("GET", "/search/photos", {
        query: query,
        page: page,
        per_page: per_page,
        order_by: order_by,
        ...rest
      });
    } catch (e) {
      throw e;
    }
  }
  async search_collections({
    query,
    page = 1,
    per_page = 10
  }) {
    try {
      if (!query) throw new Error("Query is required");
      console.log(`[LOG] Searching collections: "${query}"`);
      return await this.req("GET", "/search/collections", {
        query: query,
        page: page,
        per_page: per_page
      });
    } catch (e) {
      throw e;
    }
  }
  async search_users({
    query,
    page = 1,
    per_page = 10
  }) {
    try {
      if (!query) throw new Error("Query is required");
      console.log(`[LOG] Searching users: "${query}"`);
      return await this.req("GET", "/search/users", {
        query: query,
        page: page,
        per_page: per_page
      });
    } catch (e) {
      throw e;
    }
  }
  async collections({
    page = 1,
    per_page = 10
  }) {
    try {
      console.log("[LOG] Listing collections...");
      return await this.req("GET", "/collections", {
        page: page,
        per_page: per_page
      });
    } catch (e) {
      throw e;
    }
  }
  async collection({
    id
  }) {
    try {
      console.log(`[LOG] Fetching collection ID: ${id}`);
      return await this.req("GET", `/collections/${id}`);
    } catch (e) {
      throw e;
    }
  }
  async collection_photos({
    id,
    page = 1,
    per_page = 10,
    ...rest
  }) {
    try {
      console.log(`[LOG] Fetching photos for collection ID: ${id}`);
      return await this.req("GET", `/collections/${id}/photos`, {
        page: page,
        per_page: per_page,
        ...rest
      });
    } catch (e) {
      throw e;
    }
  }
  async related_collections({
    id
  }) {
    try {
      console.log(`[LOG] Fetching related collections for ID: ${id}`);
      return await this.req("GET", `/collections/${id}/related`);
    } catch (e) {
      throw e;
    }
  }
  async create_collection({
    title,
    description,
    private: is_private
  }) {
    try {
      console.log(`[LOG] Creating collection: ${title}`);
      const data = {
        title: title,
        description: description,
        private: is_private ? true : false
      };
      return await this.req("POST", "/collections", {}, data);
    } catch (e) {
      throw e;
    }
  }
  async update_collection({
    id,
    ...body
  }) {
    try {
      console.log(`[LOG] Updating collection ID: ${id}`);
      return await this.req("PUT", `/collections/${id}`, {}, body);
    } catch (e) {
      throw e;
    }
  }
  async delete_collection({
    id
  }) {
    try {
      console.log(`[LOG] Deleting collection ID: ${id}`);
      return await this.req("DELETE", `/collections/${id}`);
    } catch (e) {
      throw e;
    }
  }
  async add_collection_photo({
    collection_id,
    photo_id
  }) {
    try {
      console.log(`[LOG] Adding photo ${photo_id} to collection ${collection_id}`);
      return await this.req("POST", `/collections/${collection_id}/add`, {}, {
        photo_id: photo_id
      });
    } catch (e) {
      throw e;
    }
  }
  async remove_collection_photo({
    collection_id,
    photo_id
  }) {
    try {
      console.log(`[LOG] Removing photo ${photo_id} from collection ${collection_id}`);
      return await this.req("DELETE", `/collections/${collection_id}/remove`, {
        photo_id: photo_id
      });
    } catch (e) {
      throw e;
    }
  }
  async topics({
    ids,
    page = 1,
    per_page = 10,
    order_by = "position"
  }) {
    try {
      console.log("[LOG] Listing topics...");
      return await this.req("GET", "/topics", {
        ids: ids,
        page: page,
        per_page: per_page,
        order_by: order_by
      });
    } catch (e) {
      throw e;
    }
  }
  async topic({
    id_or_slug
  }) {
    try {
      console.log(`[LOG] Fetching topic: ${id_or_slug}`);
      return await this.req("GET", `/topics/${id_or_slug}`);
    } catch (e) {
      throw e;
    }
  }
  async topic_photos({
    id_or_slug,
    page = 1,
    per_page = 10,
    ...rest
  }) {
    try {
      console.log(`[LOG] Fetching photos for topic: ${id_or_slug}`);
      return await this.req("GET", `/topics/${id_or_slug}/photos`, {
        page: page,
        per_page: per_page,
        ...rest
      });
    } catch (e) {
      throw e;
    }
  }
  async total_stats() {
    try {
      console.log("[LOG] Fetching total stats...");
      return await this.req("GET", "/stats/total");
    } catch (e) {
      throw e;
    }
  }
  async month_stats() {
    try {
      console.log("[LOG] Fetching monthly stats...");
      return await this.req("GET", "/stats/month");
    } catch (e) {
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const available_actions = ["me", "update_me", "user", "user_photos", "photos", "photo", "random_photo", "search_photos", "search_collections", "search_users", "collections", "collection", "create_collection", "topics", "total_stats"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: available_actions
    });
  }
  const api = new Unsplash();
  try {
    let response;
    switch (action) {
      case "me":
        response = await api.me();
        break;
      case "update_me":
        response = await api.update_me(params);
        break;
      case "user":
        if (!params.username) {
          return res.status(400).json({
            error: "Parameter 'username' wajib diisi untuk action 'user'."
          });
        }
        response = await api.user(params);
        break;
      case "user_photos":
        if (!params.username) {
          return res.status(400).json({
            error: "Parameter 'username' wajib diisi untuk action 'user_photos'."
          });
        }
        response = await api.user_photos(params);
        break;
      case "photos":
        response = await api.photos(params);
        break;
      case "photo":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'photo'."
          });
        }
        response = await api.photo(params);
        break;
      case "random_photo":
        response = await api.random_photo(params);
        break;
      case "search_photos":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search_photos'."
          });
        }
        response = await api.search_photos(params);
        break;
      case "search_collections":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search_collections'."
          });
        }
        response = await api.search_collections(params);
        break;
      case "search_users":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search_users'."
          });
        }
        response = await api.search_users(params);
        break;
      case "collections":
        response = await api.collections(params);
        break;
      case "collection":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'collection'."
          });
        }
        response = await api.collection(params);
        break;
      case "create_collection":
        if (!params.title) {
          return res.status(400).json({
            error: "Parameter 'title' wajib diisi untuk action 'create_collection'."
          });
        }
        response = await api.create_collection(params);
        break;
      case "topics":
        response = await api.topics(params);
        break;
      case "total_stats":
        response = await api.total_stats();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: available_actions
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