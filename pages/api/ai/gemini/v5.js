import axios from "axios";
class YenusAI {
  constructor() {
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://yenus.created.app",
      priority: "u=1, i",
      referer: "https://yenus.created.app/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-createxyz-project-id": "31b1368e-b142-4030-bef4-1a10d86e4873"
    };
  }
  async chat({
    prompt,
    messages = [],
    stream = false
  }) {
    try {
      const res = await axios.post("https://yenus.created.app/integrations/google-gemini-1-5-flash", {
        messages: messages.length ? messages : [{
          role: "user",
          content: prompt
        }],
        stream: stream
      }, {
        headers: this.baseHeaders
      });
      return res.data;
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async image({
    prompt
  }) {
    try {
      const res = await axios.get(`https://yenus.created.app/integrations/dall-e-3?prompt=${encodeURIComponent(prompt)}`, {
        headers: this.baseHeaders
      });
      return res.data;
    } catch (err) {
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
        action: "chat | image"
      }
    });
  }
  const yenus = new YenusAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await yenus[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await yenus[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}