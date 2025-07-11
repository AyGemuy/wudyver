import axios from "axios";
class TeraboxSearch {
  constructor() {
    this.api = {
      base: "https://teraboxsearch.xyz",
      endpoints: {
        search: "/api/search"
      }
    };
    this.headers = {
      authority: "teraboxsearch.xyz",
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://teraboxsearch.xyz",
      referer: "https://teraboxsearch.xyz/",
      "user-agent": "Postify/1.0.0"
    };
  }
  async search({
    query,
    types = "both"
  }) {
    if (!query || typeof query !== "string" || !query.trim()) {
      return {
        success: false,
        code: 400,
        message: "Query cannot be empty.",
        result: {}
      };
    }
    const validTypes = ["groups", "content", "both"];
    if (!validTypes.includes(types)) {
      return {
        success: false,
        code: 400,
        message: `Invalid type '${types}'. Valid types are: ${validTypes.join(", ")}.`,
        result: {
          validTypes: validTypes
        }
      };
    }
    try {
      const randomId = Math.floor(Math.random() * 1e12);
      const timestamp = Math.floor(Date.now() / 1e3);
      const cookies = `_ga=GA1.1.${randomId}.${timestamp}; _ga_3V4YVZ722G=GS2.1.${timestamp}$o1$g0$t${timestamp + 10}$j50$l0$h0`;
      const response = await axios.post(`${this.api.base}${this.api.endpoints.search}`, {
        query: query
      }, {
        headers: {
          ...this.headers,
          cookie: cookies
        },
        timeout: 1e4
      });
      if (!response.data?.data) {
        return {
          success: false,
          code: 500,
          message: "Empty response from API.",
          result: {}
        };
      }
      const {
        groups = [],
          content: contents = []
      } = response.data.data;
      const result = {};
      if (types === "groups" || types === "both") {
        result.groups = groups;
      }
      if (types === "content" || types === "both") {
        result.contents = contents;
      }
      const totalResults = types === "both" ? groups.length + contents.length : types === "groups" ? groups.length : contents.length;
      return {
        success: true,
        code: 200,
        message: "Search successful.",
        types: types,
        result: {
          ...result,
          totalResults: totalResults
        }
      };
    } catch (err) {
      return {
        success: false,
        code: err.response?.status || 500,
        message: "An error occurred during the search.",
        result: {
          error: err.message || "Unknown error"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const terabox = new TeraboxSearch();
    const response = await terabox.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}