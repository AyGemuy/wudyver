import axios from "axios";
import qs from "qs";
class CodeBeautify {
  constructor() {
    this.baseUrl = "https://codebeautify.org/service";
    this.headers = {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://codebeautify.org",
      referer: "https://codebeautify.org/html-to-markdown/"
    };
  }
  async create({
    content,
    viewname = "html-to-markdown",
    title = `t${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    desc = `d${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    tags = `tag${Math.floor(Math.random() * 1e3)}`,
    expiry = 1440
  }) {
    try {
      console.log("[CodeBeautify] Creating paste...");
      const data = qs.stringify({
        content: content,
        viewname: viewname,
        title: title,
        desc: desc,
        tags: tags,
        expiryvalue: expiry
      });
      const res = await axios.post(`${this.baseUrl}/save`, data, {
        headers: this.headers
      });
      console.log("[CodeBeautify] Paste created with ID:", res.data);
      return {
        id: res.data
      };
    } catch (err) {
      console.error("[CodeBeautify] Failed to create paste:", err.message);
      return {
        error: err.message
      };
    }
  }
  async raw({
    id
  }) {
    try {
      console.log("[CodeBeautify] Fetching raw data for ID:", id);
      const data = qs.stringify({
        urlid: id
      });
      const res = await axios.post(`${this.baseUrl}/getDataFromID`, data, {
        headers: this.headers
      });
      console.log("[CodeBeautify] Raw data retrieved");
      return {
        raw: res.data
      };
    } catch (err) {
      console.error("[CodeBeautify] Failed to fetch raw data:", err.message);
      return {
        error: err.message
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
        action: "create | raw"
      }
    });
  }
  const cb = new CodeBeautify();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.content) {
          return res.status(400).json({
            error: `Missing required field: content (required for ${action})`
          });
        }
        result = await cb.create(params);
        break;
      case "raw":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await cb.raw({
          id: params.id
        });
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: create | raw`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}