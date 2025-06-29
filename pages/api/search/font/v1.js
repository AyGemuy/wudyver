import axios from "axios";
class GoogleFonts {
  constructor() {
    this.base = "https://fontasy.co/api/google/webfonts";
    this.headers = {
      accept: "application/json",
      "user-agent": "Postify/1.0.0"
    };
  }
  isValid(input) {
    if (!input?.trim()) return {
      valid: false,
      error: "Font name is required."
    };
    const valid = /^[a-zA-Z0-9\s-]+$/.test(input.trim());
    return valid ? {
      valid: true,
      fontName: input.trim()
    } : {
      valid: false,
      error: "Invalid font name format."
    };
  }
  async get() {
    try {
      const res = await axios.get(this.base, {
        headers: this.headers,
        validateStatus: false
      });
      return res;
    } catch (e) {
      return {
        status: e?.response?.status || 500,
        data: {
          error: e?.response?.data?.message || e.message || "Request failed."
        }
      };
    }
  }
  async search({
    query
  }) {
    const check = this.isValid(query);
    if (!check.valid) return {
      status: 400,
      data: {
        error: check.error
      }
    };
    const res = await this.get();
    if (!res?.data?.items) return res;
    const match = res.data.items.filter(f => f.family.toLowerCase().includes(query.toLowerCase()) || f.category.toLowerCase().includes(query.toLowerCase()));
    return {
      status: 200,
      data: {
        query: query,
        total: match.length,
        fonts: match
      }
    };
  }
  async category({
    type,
    count = 20
  }) {
    if (isNaN(count) || count < 1) return {
      status: 400,
      data: {
        error: "Minimum count is 1."
      }
    };
    const res = await this.get();
    if (!res?.data?.items) return res;
    const fonts = res.data.items;
    let sorted;
    switch (type?.toLowerCase()) {
      case "trending":
        sorted = fonts.filter(f => f.trending).sort((a, b) => b.trending - a.trending);
        break;
      case "popular":
        sorted = fonts.filter(f => f.popularity).sort((a, b) => b.popularity - a.popularity);
        break;
      default:
        return {
          status: 400,
            data: {
              error: 'Invalid category. Use "trending" or "popular".'
            }
        };
    }
    return {
      status: 200,
      data: {
        category: type,
        count: count,
        fonts: sorted.slice(0, count)
      }
    };
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
        action: "search | category"
      }
    });
  }
  const fontic = new GoogleFonts();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await fontic[action](params);
        break;
      case "category":
        if (!params.type) {
          return res.status(400).json({
            error: `Missing required field: type (required for ${action})`
          });
        }
        result = await fontic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | category`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}