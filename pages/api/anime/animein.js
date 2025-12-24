import axios from "axios";
class AnimeIn {
  constructor() {
    this.api = {
      base: "https://xyz-api.animein.net",
      image: "https://api.animein.net",
      endpoint: {
        home: include => `/3/2/home/${include}`,
        popular: "/3/2/home/popular",
        explore: "/3/2/explore/data",
        search: "/3/2/explore/movie",
        fyp: "/data/home/fyp",
        schedule: "/3/2/schedule/data",
        details: id => `/3/2/movie/detail/${id}`,
        episodeList: id => `/3/2/movie/episode/${id}`,
        streams: id => `/3/2/episode/streamnew/${id}`
      }
    };
    this.headers = {
      "user-agent": "NB Android/1.0.0",
      connection: "Keep-Alive",
      "accept-encoding": "gzip"
    };
  }
  imgex(item) {
    if (!item || typeof item !== "object") return item;
    const clone = {
      ...item
    };
    const fields = ["image", "image_poster", "image_cover"];
    fields.forEach(field => {
      if (clone[field] && !clone[field].startsWith("http")) {
        clone[field] = `${this.api.image}${clone[field]}`;
      }
    });
    return clone;
  }
  async home({
    include = "",
    day,
    limit,
    id_user = 0,
    key_client = "null"
  } = {}) {
    try {
      const isOpt = ["data", "hot", "new", "popular", "random"];
      if (!include?.toString().trim()) {
        console.error("Home error: Include parameter is required");
        return {
          success: false,
          code: 400,
          result: {
            error: "Includenya kagak boleh kosong yak bree.. 🗿"
          }
        };
      }
      if (!isOpt.includes(include.toLowerCase())) {
        console.error(`Home error: Invalid include parameter: ${include}`);
        return {
          success: false,
          code: 400,
          result: {
            error: "Include apaan njirr ini? kagak ada di list 😂 ganti2.."
          }
        };
      }
      if (!limit || isNaN(limit)) {
        console.error("Home error: Limit parameter is required and must be a number");
        return {
          success: false,
          code: 400,
          result: {
            error: "Limitnya kagak boleh kosong bree.."
          }
        };
      }
      if (include.toLowerCase() === "data" && !day?.toString().trim()) {
        console.error("Home error: Day parameter is required for include=data");
        return {
          success: false,
          code: 400,
          result: {
            error: "Harinya kudu diisi yak bree untuk include=data 🗿"
          }
        };
      }
      const params = {
        limit: limit,
        id_user: id_user,
        key_client: key_client
      };
      let url = "";
      switch (include.toLowerCase()) {
        case "data":
          params.setup_fyp_flag = "Y";
          params.day = day.toUpperCase();
          url = `${this.api.base}${this.api.endpoint.home("data")}`;
          break;
        case "hot":
        case "new":
        case "random":
          url = `${this.api.base}${this.api.endpoint.home(include.toLowerCase())}`;
          break;
        case "popular":
          url = `${this.api.base}${this.api.endpoint.popular}`;
          break;
      }
      console.log(`Making home request to: ${url}`);
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        params: params,
        timeout: 1e4
      });
      const keyx = ["popular", "random"].includes(include.toLowerCase()) ? {
        movie: (data.data?.movie ?? []).map(m => this.imgex(m))
      } : Array.isArray(data.data?.movie) ? {
        ...data.data,
        movie: data.data.movie.map(m => this.imgex(m))
      } : data.data ?? {};
      console.log("Home request successful");
      return {
        success: true,
        code: 200,
        result: keyx
      };
    } catch (error) {
      console.error("Home request failed:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async explore({
    limit = 3
  } = {}) {
    try {
      if (!limit || isNaN(limit)) {
        console.error("Explore error: Limit parameter is required");
        return {
          success: false,
          code: 400,
          result: {
            error: "Limitnya kagak boleh kosong bree..."
          }
        };
      }
      console.log(`Making explore request with limit: ${limit}`);
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoint.explore}`, {
        headers: this.headers,
        params: {
          limit: limit
        },
        timeout: 1e4
      });
      console.log("Explore request successful");
      return {
        success: true,
        code: 200,
        result: {
          genre: data.data?.genre ?? [],
          year: data.data?.year ?? [],
          trailer: (data.data?.trailer ?? []).map(t => this.imgex(t))
        }
      };
    } catch (error) {
      console.error("Explore request failed:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async search({
    keyword = "",
    genre_in = "",
    sort = "views",
    page = 0
  } = {}) {
    try {
      if (!keyword?.toString().trim()) {
        console.error("Search error: Keyword parameter is required");
        return {
          success: false,
          code: 400,
          result: {
            error: "Keyword pencariannya kagak boleh kosong bree... 🗿"
          }
        };
      }
      const params = {
        keyword: keyword,
        genre_in: genre_in,
        sort: sort,
        page: page
      };
      console.log(`Making search request for keyword: ${keyword}`);
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoint.search}`, {
        headers: this.headers,
        params: params,
        timeout: 1e4
      });
      console.log("Search request successful");
      return {
        success: true,
        code: 200,
        result: {
          movie: (data.data?.movie ?? []).map(m => this.imgex(m))
        }
      };
    } catch (error) {
      console.error("Search request failed:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async getFyp({
    favorite = -1,
    id_fyp = "",
    id_user = 0,
    key_client = "null"
  } = {}) {
    try {
      console.log("Making FYP request");
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoint.fyp}`, {
        headers: this.headers,
        params: {
          favorite: favorite,
          id_fyp: id_fyp,
          id_user: id_user,
          key_client: key_client
        },
        timeout: 1e4
      });
      const result = data.data ?? {};
      if (Array.isArray(result.movie)) {
        result.movie = result.movie.map(m => this.imgex(m));
      }
      console.log("FYP request successful");
      return {
        success: true,
        code: 200,
        result: result
      };
    } catch (error) {
      console.error("FYP request failed:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async schedule({
    day
  } = {}) {
    try {
      const isDays = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
      if (!day?.toString().trim()) {
        console.error("Schedule error: Day parameter is required");
        return {
          success: false,
          code: 400,
          result: {
            error: "Harinya kagak boleh kosong bree.. 🗿"
          }
        };
      }
      if (!isDays.includes(day.toUpperCase())) {
        console.error(`Schedule error: Invalid day parameter: ${day}`);
        return {
          success: false,
          code: 400,
          result: {
            error: "Hari apaan njirr? kagak ada di list 😂 ganti2.."
          }
        };
      }
      console.log(`Making schedule request for day: ${day}`);
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoint.schedule}`, {
        headers: this.headers,
        params: {
          day: day.toUpperCase()
        },
        timeout: 1e4
      });
      console.log("Schedule request successful");
      return {
        success: true,
        code: 200,
        result: {
          movie: (data.data?.movie ?? []).map(m => this.imgex(m))
        }
      };
    } catch (error) {
      console.error("Schedule request failed:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async info({
    input,
    id_user = 0,
    key_client = "null",
    page = 0,
    search = ""
  } = {}) {
    try {
      if (!input?.toString().trim()) {
        console.error("Info error: Input parameter is required");
        return {
          success: false,
          code: 400,
          result: {
            error: "ID kagak boleh kosong yak bree .. 😏"
          }
        };
      }
      const ids = input.toString().match(/\d+$/)?.[0] || input;
      console.log(`Making info request for ID: ${ids}`);
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoint.details(ids)}`, {
        headers: this.headers,
        params: {
          id_user: id_user,
          key_client: key_client
        },
        timeout: 1e4
      });
      const movie = this.imgex(data.data?.movie ?? {});
      const episode_first = this.imgex(data.data?.episode ?? {});
      const season = (data.data?.season ?? []).map(m => this.imgex(m));
      let episodes = [];
      if (movie.type === "SERIES") {
        console.log(`Fetching episodes for series: ${ids}`);
        const eps = await axios.get(`${this.api.base}${this.api.endpoint.episodeList(ids)}`, {
          headers: this.headers,
          params: {
            id_user: id_user,
            key_client: key_client,
            page: page,
            search: search
          },
          timeout: 1e4
        });
        episodes = (eps.data?.data?.episode ?? []).map(e => this.imgex(e));
      }
      console.log("Info request successful");
      return {
        success: true,
        code: 200,
        result: {
          type: movie.type || null,
          movie: movie,
          episode_first: episode_first,
          episodes: episodes,
          season: season
        }
      };
    } catch (error) {
      console.error("Info request failed:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
    }
  }
  async streams({
    id
  } = {}) {
    try {
      if (!id?.toString().trim()) {
        console.error("Streams error: ID parameter is required");
        return {
          success: false,
          code: 400,
          result: {
            error: "ID episode kagak boleh kosong yak bree... 🖕🏻"
          }
        };
      }
      console.log(`Making streams request for episode ID: ${id}`);
      const {
        data
      } = await axios.get(`${this.api.base}${this.api.endpoint.streams(id)}`, {
        headers: this.headers,
        timeout: 1e4
      });
      console.log("Streams request successful");
      return {
        success: true,
        code: 200,
        result: {
          episode: this.imgex(data.data?.episode ?? {}),
          episode_next: this.imgex(data.data?.episode_next ?? null),
          server: (data.data?.server ?? []).map(s => this.imgex(s))
        }
      };
    } catch (error) {
      console.error("Streams request failed:", error.message);
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.message
        }
      };
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
      error: "Missing required field: action",
      required: {
        action: "home | explore | search | getFyp | schedule | info | streams"
      }
    });
  }
  const animeClient = new AnimeIn();
  try {
    let result;
    switch (action) {
      case "home":
        if (!params.include) {
          return res.status(400).json({
            error: `Missing required field: include (required for ${action})`
          });
        }
        if (params.include === "data" && !params.day) {
          return res.status(400).json({
            error: `Missing required field: day (required for include=data in ${action})`
          });
        }
        if (!params.limit) {
          return res.status(400).json({
            error: `Missing required field: limit (required for ${action})`
          });
        }
        result = await animeClient.home(params);
        break;
      case "explore":
        if (!params.limit) {
          return res.status(400).json({
            error: `Missing required field: limit (required for ${action})`
          });
        }
        result = await animeClient.explore(params);
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            error: `Missing required field: keyword (required for ${action})`
          });
        }
        result = await animeClient.search(params);
        break;
      case "getFyp":
        result = await animeClient.getFyp(params);
        break;
      case "schedule":
        if (!params.day) {
          return res.status(400).json({
            error: `Missing required field: day (required for ${action})`
          });
        }
        result = await animeClient.schedule(params);
        break;
      case "info":
        if (!params.input) {
          return res.status(400).json({
            error: `Missing required field: input (required for ${action})`
          });
        }
        result = await animeClient.info(params);
        break;
      case "streams":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await animeClient.streams(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: home | explore | search | getFyp | schedule | info | streams`
        });
    }
    return res.status(result.code).json(result);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`,
      success: false,
      code: 500
    });
  }
}