import axios from "axios";
class LaheluAPI {
  constructor(cookie = "") {
    this.config = {
      baseURL: "https://lahelu.com/api",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        Priority: "u=1, i",
        "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Cookie: cookie || `_ga=${Date.now()};`
      },
      endpoints: {
        recommendations: "/post/get-recommendations",
        searchPost: "/post/get-search",
        searchUser: "/user/get-search",
        searchHashtag: "/post/get-hashtag-posts",
        searchTopic: "/topic/get-search"
      },
      defaults: {
        recommendationTypes: {
          for_you: 5,
          fresh: 6,
          viral: 7
        },
        recommendation: {
          type: "for_you"
        },
        searchHashtag: {
          isNewest: false
        },
        search: {
          cursor: 1
        }
      }
    };
    this.client = axios.create({
      baseURL: this.config.baseURL,
      headers: this.config.headers
    });
    console.log("[LOG] - Instance LaheluAPI telah dibuat.");
  }
  async get(path, params) {
    console.log(`[LOG] - Memulai permintaan GET ke: ${path} dengan params:`, params || {});
    try {
      const response = await this.client.get(path, {
        params: params
      });
      const data = response?.data;
      console.log(`[LOG] - Permintaan berhasil, status: ${response?.status}`);
      return data;
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Terjadi error tidak diketahui";
      console.error(`[LOG] - Gagal melakukan permintaan ke ${path}: ${errorMessage}`);
      return null;
    }
  }
  async recommendation({
    type,
    field,
    cursor
  }) {
    const recommendationType = type || this.config.defaults.recommendation.type;
    const fieldId = field || this.config.defaults.recommendationTypes[recommendationType];
    if (!fieldId) {
      console.error(`[LOG] - Tipe rekomendasi tidak valid: '${recommendationType}'. Gunakan 'for_you', 'fresh', 'viral', atau berikan 'field' numerik.`);
      return null;
    }
    console.log(`[LOG] - Memulai permintaan rekomendasi untuk field '${fieldId}' (type: '${recommendationType}')`);
    const params = {
      ...this.config.defaults.search,
      cursor: cursor,
      field: fieldId
    };
    return await this.get(this.config.endpoints.recommendations, params);
  }
  async search({
    mode,
    query,
    ...rest
  }) {
    const searchMode = mode || "post";
    console.log(`[LOG] - Memulai pencarian mode '${searchMode}' untuk query '${query}'`);
    let path;
    let params = {
      ...this.config.defaults.search,
      ...rest
    };
    switch (searchMode) {
      case "user":
        path = this.config.endpoints.searchUser;
        params.query = query;
        break;
      case "topic":
        path = this.config.endpoints.searchTopic;
        params.query = query;
        break;
      case "hashtag":
        path = this.config.endpoints.searchHashtag;
        params.hashtag = query;
        params.isNewest = rest.isNewest !== undefined ? rest.isNewest : this.config.defaults.searchHashtag.isNewest;
        break;
      case "post":
      default:
        path = this.config.endpoints.searchPost;
        params.query = query;
        break;
    }
    return await this.get(path, params);
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
  const lahelu = new LaheluAPI();
  try {
    let response;
    switch (action) {
      case "recommendation":
        response = await lahelu.recommendation(params);
        return res.status(200).json(response);
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await lahelu.search(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'recommendation', 'search'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}