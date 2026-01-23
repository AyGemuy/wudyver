import axios from "axios";
import ApiKey from "@/configs/api-key";
class GiphySDK {
  constructor() {
    this.apiKeys = ApiKey.giphy;
    this.baseURL = "https://api.giphy.com/v1";
    this.headers = {
      "User-Agent": "Android CoreSDK,UISDK v3.1.12,2.3.17",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip,br",
      "X-GIPHY-SDK-PLATFORM": "Android",
      "X-GIPHY-UI-SDK-IS-EXTENSION": "false",
      "X-GIPHY-SDK-VERSION": "3.1.12,2.3.17",
      "X-GIPHY-SDK-NAME": "CoreSDK,UISDK"
    };
  }
  rand(length = 32) {
    let result = "";
    const characters = "0123456789abcdef";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  async request(endpoint, params = {}) {
    let lastError = null;
    if (!params.random_id) {
      params.random_id = this.rand();
    }
    for (const key of this.apiKeys) {
      try {
        const config = {
          method: "GET",
          url: `${this.baseURL}${endpoint}`,
          headers: this.headers,
          params: {
            ...params,
            api_key: key
          }
        };
        const {
          data
        } = await axios(config);
        return data;
      } catch (e) {
        lastError = e;
        if (e.response && (e.response.status === 401 || e.response.status === 403)) {
          console.warn(`[GiphySDK] Key ${key.substr(0, 5)}... expired. Switching...`);
          continue;
        }
        console.error(`[GiphySDK] Error on ${endpoint}:`, e?.message);
        throw new Error(e?.response?.data?.meta?.msg || e?.message || "Request Failed");
      }
    }
    throw new Error(`All API Keys exhausted. Last error: ${lastError?.message}`);
  }
  async trendingSearches() {
    try {
      console.log("[trendingSearches] Fetching...");
      return await this.request("/trending/searches");
    } catch (e) {
      throw e;
    }
  }
  async stickerTrending({
    limit = 25,
    offset = 0,
    rating = "pg-13"
  } = {}) {
    try {
      console.log(`[stickerTrending] Limit: ${limit}`);
      return await this.request("/stickers/trending", {
        limit: limit,
        offset: offset,
        rating: rating
      });
    } catch (e) {
      throw e;
    }
  }
  async searchChannels({
    q,
    limit = 25,
    offset = 0
  } = {}) {
    try {
      if (!q) throw new Error("Query 'q' is required for channel search");
      console.log(`[searchChannels] Query: ${q}`);
      const data = await this.request("/channels/search", {
        q: q,
        limit: limit,
        offset: offset
      });
      console.log("[searchChannels] Success");
      return data;
    } catch (e) {
      throw e;
    }
  }
  async searchStickers({
    q,
    limit = 25,
    offset = 0,
    rating = "pg-13"
  } = {}) {
    try {
      if (!q) throw new Error("Query 'q' is required");
      console.log(`[searchStickers] Query: ${q}`);
      return await this.request("/stickers/search", {
        q: q,
        limit: limit,
        offset: offset,
        rating: rating
      });
    } catch (e) {
      throw e;
    }
  }
  async getGifDetail({
    id
  }) {
    try {
      if (!id) throw new Error("ID required");
      console.log(`[getGifDetail] ID: ${id}`);
      return await this.request(`/gifs/${id}`);
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
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["trending_searches", "trending_stickers", "search_channels", "search_stickers", "detail_gif"]
    });
  }
  const api = new GiphySDK();
  try {
    let result;
    switch (action) {
      case "trending_searches":
        result = await api.trendingSearches();
        break;
      case "trending_stickers":
        result = await api.stickerTrending(params);
        break;
      case "search_channels":
        if (!params.q) return res.status(400).json({
          error: "Parameter 'q' required"
        });
        result = await api.searchChannels(params);
        break;
      case "search_stickers":
        if (!params.q) return res.status(400).json({
          error: "Parameter 'q' required"
        });
        result = await api.searchStickers(params);
        break;
      case "detail_gif":
        if (!params.id) return res.status(400).json({
          error: "Parameter 'id' required"
        });
        result = await api.getGifDetail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["trending_searches", "trending_stickers", "search_channels", "search_stickers", "detail_gif"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}