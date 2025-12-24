import axios from "axios";
class HanimeAPI {
  constructor(baseURL = "https://hani.nyt92.eu.org", token = null) {
    this.api = axios.create({
      baseURL: baseURL
    });
    this.sessionToken = null;
    console.log("[HanimeAPI] Instance created.");
    if (token) {
      this.setToken(token);
    }
  }
  setToken(token) {
    this.sessionToken = token;
    console.log("[HanimeAPI] Session token has been set.");
  }
  _getAuthHeaders() {
    if (!this.sessionToken) {
      throw new Error("Token sesi tidak diatur. Harap login atau berikan token.");
    }
    return {
      Token: this.sessionToken
    };
  }
  async login(email, password) {
    console.log(`[HanimeAPI] Attempting login for: ${email}`);
    try {
      const response = await this.api.post("/auth/login", {
        email: email,
        password: password
      });
      if (response.data.session_token) this.setToken(response.data.session_token);
      console.log(`[HanimeAPI] Login successful.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Login failed:`, error.response?.data || error.message);
      throw error;
    }
  }
  async loginSummary(email, password) {
    console.log(`[HanimeAPI] Attempting login summary for: ${email}`);
    try {
      const response = await this.api.post("/auth/login/summary", {
        email: email,
        password: password
      });
      if (response.data.session_token) this.setToken(response.data.session_token);
      console.log(`[HanimeAPI] Login summary successful.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Login summary failed:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getCoins(email, password) {
    console.log(`[HanimeAPI] Attempting to get daily coins for: ${email}`);
    try {
      const response = await this.api.post("/auth/getcoins", {
        email: email,
        password: password
      });
      console.log("[HanimeAPI] Get coins request completed.");
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Get coins failed:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getInfo(id) {
    console.log(`[HanimeAPI] Fetching info for ID: ${id}`);
    try {
      const response = await this.api.get(`/getInfo/${id}`);
      console.log(`[HanimeAPI] Successfully fetched info for: ${response.data?.title}`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get info for ID ${id}:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getVideo(id) {
    console.log(`[HanimeAPI] Fetching video streams for ID: ${id}`);
    try {
      const headers = this.sessionToken ? this._getAuthHeaders() : {};
      const response = await this.api.get(`/getVideo/${id}`, {
        headers: headers
      });
      console.log(`[HanimeAPI] Successfully fetched video streams for: ${response.data?.title}`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get video for ID ${id}:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getComments(videoId) {
    console.log(`[HanimeAPI] Fetching comments for video ID: ${videoId}`);
    try {
      const response = await this.api.get("/getComment", {
        params: {
          id: videoId
        }
      });
      console.log(`[HanimeAPI] Successfully fetched ${response.data?.total} comments.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get comments for video ID ${videoId}:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getCommentReplies(replyId) {
    console.log(`[HanimeAPI] Fetching replies for comment ID: ${replyId}`);
    try {
      const response = await this.api.get("/getComment/reply", {
        params: {
          id: replyId
        }
      });
      console.log(`[HanimeAPI] Successfully fetched ${response.data?.total} replies.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get replies for comment ID ${replyId}:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getRecentUploads() {
    console.log("[HanimeAPI] Fetching recent uploads.");
    try {
      const response = await this.api.get("/getLanding/recent");
      console.log(`[HanimeAPI] Successfully fetched recent uploads.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get recent uploads:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getNewestReleases() {
    console.log("[HanimeAPI] Fetching newest releases.");
    try {
      const response = await this.api.get("/getLanding/newest");
      console.log(`[HanimeAPI] Successfully fetched newest releases.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get newest releases:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getTrending({
    time = "month",
    page = 0
  } = {}) {
    console.log(`[HanimeAPI] Fetching trending videos (time=${time}, page=${page})`);
    try {
      const response = await this.api.get("/getLanding/trending", {
        params: {
          time: time,
          p: page
        }
      });
      console.log(`[HanimeAPI] Successfully fetched trending videos.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get trending videos:`, error.response?.data || error.message);
      throw error;
    }
  }
  async searchByPost(params) {
    console.log(`[HanimeAPI] Performing search (POST) with params:`, params);
    try {
      const payload = {
        search_text: params.search || null,
        tags: params.tags || [],
        brands: params.brands || [],
        blacklist: params.blacklist || [],
        order_by: params.order_by || null,
        ordering: params.ordering || null,
        page: params.page || null
      };
      const response = await this.api.post("/search", payload);
      console.log(`[HanimeAPI] Search (POST) completed.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Search (POST) failed:`, error.response?.data || error.message);
      throw error;
    }
  }
  async searchByGet({
    q,
    p,
    ordering,
    order_by
  }) {
    console.log(`[HanimeAPI] Performing search (GET) with query: ${q}`);
    try {
      const response = await this.api.get("/search", {
        params: {
          q: q,
          p: p,
          ordering: ordering,
          order_by: order_by
        }
      });
      console.log(`[HanimeAPI] Search (GET) completed.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Search (GET) failed:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getBrowseIndex() {
    console.log("[HanimeAPI] Fetching browse index (tags and brands).");
    try {
      const response = await this.api.get("/browse");
      console.log("[HanimeAPI] Successfully fetched browse index.");
      return response.data;
    } catch (error) {
      console.error("[HanimeAPI] Failed to get browse index:", error.response?.data || error.message);
      throw error;
    }
  }
  async browseByTag(type, tag, page) {
    console.log(`[HanimeAPI] Browsing by tag (type=${type}, tag=${tag}, page=${page})`);
    try {
      const response = await this.api.get(`/browse/${type}/${tag}/${page}`);
      console.log(`[HanimeAPI] Successfully browsed tag: ${tag}.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to browse tag ${tag}:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getMyUser() {
    console.log(`[HanimeAPI] Fetching current user's profile.`);
    try {
      const headers = this._getAuthHeaders();
      const response = await this.api.get("/user", {
        headers: headers
      });
      console.log(`[HanimeAPI] Successfully fetched profile for user: ${response.data?.user?.name}`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get current user's profile:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getUser(channelId) {
    console.log(`[HanimeAPI] Fetching user profile for channel ID: ${channelId}`);
    try {
      const response = await this.api.get(`/user/${channelId}`);
      console.log(`[HanimeAPI] Successfully fetched profile for user: ${response.data?.user?.name}`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get user profile for channel ID ${channelId}:`, error.response?.data || error.message);
      throw error;
    }
  }
  async getCommunityUploads({
    page = 1
  } = {}) {
    console.log(`[HanimeAPI] Fetching community uploads for page: ${page}`);
    try {
      const response = await this.api.get("/community_upload", {
        params: {
          p: page
        }
      });
      console.log(`[HanimeAPI] Successfully fetched community uploads.`);
      return response.data;
    } catch (error) {
      console.error(`[HanimeAPI] Failed to get community uploads:`, error.response?.data || error.message);
      throw error;
    }
  }
  async filterCommunityUploads(params) {
    console.log("[HanimeAPI] Filtering community uploads with params:", params);
    try {
      const payload = {
        page: 1,
        ...params
      };
      const response = await this.api.post("/community_upload", payload);
      console.log("[HanimeAPI] Successfully filtered community uploads.");
      return response.data;
    } catch (error) {
      console.error("[HanimeAPI] Failed to filter community uploads:", error.response?.data || error.message);
      throw error;
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new HanimeAPI("https://hani.nyt92.eu.org", params.token);
  try {
    let response;
    switch (action) {
      case "login":
      case "login_summary":
      case "get_coins":
        if (!params.email || !params.password) return res.status(400).json({
          error: "Paramenter 'email' dan 'password' wajib diisi."
        });
        if (action === "login") response = await api.login(params.email, params.password);
        if (action === "login_summary") response = await api.loginSummary(params.email, params.password);
        if (action === "get_coins") response = await api.getCoins(params.email, params.password);
        break;
      case "get_info":
      case "get_video":
        if (!params.id) return res.status(400).json({
          error: "Paramenter 'id' wajib diisi."
        });
        response = action === "get_info" ? await api.getInfo(params.id) : await api.getVideo(params.id);
        break;
      case "get_comments":
        if (!params.video_id) return res.status(400).json({
          error: "Paramenter 'video_id' wajib diisi."
        });
        response = await api.getComments(params.video_id);
        break;
      case "get_comment_replies":
        if (!params.reply_id) return res.status(400).json({
          error: "Paramenter 'reply_id' wajib diisi."
        });
        response = await api.getCommentReplies(params.reply_id);
        break;
      case "get_recent_uploads":
        response = await api.getRecentUploads();
        break;
      case "get_newest_releases":
        response = await api.getNewestReleases();
        break;
      case "get_trending":
        response = await api.getTrending(params);
        break;
      case "search_by_post":
        response = await api.searchByPost(params);
        break;
      case "search_by_get":
        if (!params.q) return res.status(400).json({
          error: "Paramenter 'q' (query) wajib diisi."
        });
        response = await api.searchByGet(params);
        break;
      case "get_browse_index":
        response = await api.getBrowseIndex();
        break;
      case "browse_by_tag":
        if (!params.type || !params.tag || !params.page) return res.status(400).json({
          error: "Paramenter 'type', 'tag', dan 'page' wajib diisi."
        });
        response = await api.browseByTag(params.type, params.tag, params.page);
        break;
      case "get_my_user":
        if (!api.sessionToken) return res.status(401).json({
          error: "Action ini memerlukan parameter 'token' yang valid."
        });
        response = await api.getMyUser();
        break;
      case "get_user":
        if (!params.channel_id) return res.status(400).json({
          error: "Paramenter 'channel_id' wajib diisi."
        });
        response = await api.getUser(params.channel_id);
        break;
      case "get_community_uploads":
        response = await api.getCommunityUploads(params);
        break;
      case "filter_community_uploads":
        response = await api.filterCommunityUploads(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}