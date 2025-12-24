import axios from "axios";
class Animob {
  constructor() {
    this.client = axios.create({
      baseURL: "https://animob-vidstr.fun/api",
      headers: {
        "accept-encoding": "gzip",
        connection: "Keep-Alive",
        host: "animob-vidstr.fun",
        "user-agent": "okhttp/4.9.2"
      }
    });
    console.log("Animob client initialized");
  }
  async home({
    page = 1,
    ...rest
  }) {
    console.log("Fetching home data...");
    try {
      const {
        data
      } = await this.client("/");
      console.log("Home data fetched successfully");
      return data?.results || [];
    } catch (error) {
      console.error("Home fetch error:", error.message);
      throw error;
    }
  }
  async genre({
    genre = "action",
    page = 1,
    ...rest
  }) {
    console.log(`Fetching genre: ${genre}, page: ${page}`);
    try {
      const genres = ["action", "adventure", "cars", "comedy", "dementia", "demons", "drama", "ecchi", "fantasy", "game", "harem", "historical", "horror", "isekai", "josei", "kids", "magic", "martial-arts", "mecha", "military", "music", "mystery", "parody", "police", "psychological", "romance", "samurai", "school", "sci-fi", "seinen", "shoujo", "shoujo-ai", "shounen", "shounen-ai", "slice-of-life", "space", "sports", "super-power", "supernatural", "thriller", "vampire"];
      if (!genres.includes(genre)) {
        throw new Error(`Available genres: ${genres.join(", ")}`);
      }
      const {
        data
      } = await this.client(`/genre/${genre}`, {
        params: {
          page: page
        }
      });
      console.log(`Genre ${genre} page ${page} fetched`);
      return data?.results || [];
    } catch (error) {
      console.error("Genre fetch error:", error.message);
      throw error;
    }
  }
  async search({
    query = "",
    page = 1,
    ...rest
  }) {
    console.log(`Searching for: ${query || "(empty)"}, page: ${page}`);
    try {
      if (!query.trim()) {
        throw new Error("Search query is required");
      }
      const {
        data
      } = await this.client("/filter", {
        params: {
          keyword: query,
          page: page
        }
      });
      console.log(`Search results for "${query}" fetched`);
      return data?.results || [];
    } catch (error) {
      console.error("Search error:", error.message);
      throw error;
    }
  }
  async detail({
    id = "",
    ...rest
  }) {
    console.log(`Fetching detail for id: ${id || "(none)"}`);
    try {
      if (!id) {
        throw new Error("Anime ID is required");
      }
      const [infoData, epData] = await Promise.all([this.client(`/info?id=${id}`), this.client(`/episodes/${id}`)]);
      console.log(`Detail for ${id} fetched successfully`);
      return {
        ...infoData?.data?.results,
        episodes: epData?.data?.results?.episodes || []
      };
    } catch (error) {
      console.error("Detail fetch error:", error.message);
      throw error;
    }
  }
  async episode({
    episodeId = "",
    ...rest
  }) {
    console.log(`Fetching episode: ${episodeId || "(none)"}`);
    try {
      if (!episodeId || !episodeId.includes("?ep=")) {
        throw new Error("Valid episode ID is required (format: ?ep=xxx)");
      }
      const {
        data
      } = await this.client(`/backup/show-anime?episodeId=${episodeId}`);
      console.log(`Episode ${episodeId} fetched successfully`);
      return data?.results || {};
    } catch (error) {
      console.error("Episode fetch error:", error.message);
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
      status: false,
      error: "Action parameter is required",
      available_actions: ["home", "genre", "search", "detail", "episode"]
    });
  }
  const api = new Animob();
  try {
    let response;
    switch (action.toLowerCase()) {
      case "home":
        response = await api.home(params);
        break;
      case "genre":
        response = await api.genre(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Query parameter is required for search"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "ID parameter is required for detail"
          });
        }
        response = await api.detail(params);
        break;
      case "episode":
        if (!params.episodeId) {
          return res.status(400).json({
            status: false,
            error: "episodeId parameter is required"
          });
        }
        response = await api.episode(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Unknown action: ${action}`,
          available_actions: ["home", "genre", "search", "detail", "episode"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`Error in action ${action}:`, error.message);
    return res.status(500).json({
      status: false,
      action: action,
      error: error.message || "Internal server error"
    });
  }
}