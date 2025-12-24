import axios from "axios";
const API_ORIGIN = "https://api.pastes.dev";
const WEB_ORIGIN = "https://pastes.dev";
class PastesDev {
  constructor() {
    this.apiOrigin = API_ORIGIN;
    this.webOrigin = WEB_ORIGIN;
  }
  async create({
    content
  }) {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error("Content cannot be empty");
      }
      const response = await axios.post(`${this.apiOrigin}/post`, content, {
        headers: {
          accept: "application/json",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "text/plain",
          origin: this.webOrigin,
          referer: `${this.webOrigin}/`,
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      if (response.data && response.data.key) {
        const key = response.data.key;
        const url = `${this.webOrigin}/${key}`;
        return {
          status: "success",
          key: key,
          url: url,
          raw: `${this.apiOrigin}/${key}`
        };
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error creating paste:", err.message);
      return {
        status: "error",
        error: err.message
      };
    }
  }
  async read({
    key
  }) {
    try {
      if (!key || key.trim().length === 0) {
        throw new Error("Key cannot be empty");
      }
      const response = await axios.get(`${this.apiOrigin}/${key}`, {
        headers: {
          accept: "text/plain",
          "accept-language": "en-US,en;q=0.9",
          referer: `${this.webOrigin}/`,
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        },
        responseType: "text"
      });
      return {
        status: "success",
        key: key,
        content: response.data,
        url: `${this.webOrigin}/${key}`
      };
    } catch (err) {
      console.error("Error reading paste:", err.message);
      if (err.response && err.response.status === 404) {
        return {
          status: "error",
          error: "Paste not found"
        };
      }
      return {
        status: "error",
        error: err.message
      };
    }
  }
  async raw({
    key
  }) {
    try {
      if (!key || key.trim().length === 0) {
        throw new Error("Key cannot be empty");
      }
      const response = await axios.get(`${this.apiOrigin}/${key}`, {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          referer: `${this.webOrigin}/`,
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        responseType: "text"
      });
      return {
        status: "success",
        key: key,
        raw: response.data,
        url: `${this.webOrigin}/${key}`
      };
    } catch (err) {
      console.error("Error getting raw paste:", err.message);
      if (err.response && err.response.status === 404) {
        return {
          status: "error",
          error: "Paste not found"
        };
      }
      return {
        status: "error",
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
        action: "create | read | raw"
      },
      examples: {
        create: {
          action: "create",
          content: "Your paste content here"
        },
        read: {
          action: "read",
          key: "paste_key"
        },
        raw: {
          action: "raw",
          key: "paste_key"
        }
      }
    });
  }
  const scraper = new PastesDev();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.content) {
          return res.status(400).json({
            error: "Missing required field: content",
            example: {
              action: "create",
              content: "Your paste content here"
            }
          });
        }
        result = await scraper.create(params);
        break;
      case "read":
        if (!params.key) {
          return res.status(400).json({
            error: "Missing required field: key",
            example: {
              action: "read",
              key: "paste_key"
            }
          });
        }
        result = await scraper.read(params);
        break;
      case "raw":
        if (!params.key) {
          return res.status(400).json({
            error: "Missing required field: key",
            example: {
              action: "raw",
              key: "paste_key"
            }
          });
        }
        result = await scraper.raw(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          allowed: ["create", "read", "raw"]
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}