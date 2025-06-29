import axios from "axios";
class AI4chat {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    prompt = "",
    country = "Asia",
    user_id = "usersmjb2oaz7y"
  }) {
    try {
      const response = await axios.get(`https://yw85opafq6.execute-api.us-east-1.amazonaws.com/default/boss_mode_15aug?text=${encodeURIComponent(prompt)}&country=${encodeURIComponent(country)}&user_id=${encodeURIComponent(user_id)}`, {
        headers: {
          ...this.headers,
          Origin: "https://www.ai4chat.co",
          Referer: "https://www.ai4chat.co/",
          "Sec-Fetch-Site": "cross-site"
        }
      });
      return {
        result: response.data
      };
    } catch (error) {
      throw new Error("Error generating chat: " + error.message);
    }
  }
  async image({
    prompt = "",
    ratio = "9:16"
  }) {
    try {
      const response = await axios.get(`https://www.ai4chat.co/api/image/generate?prompt=${encodeURIComponent(prompt)}&aspect_ratio=${encodeURIComponent(ratio)}`, {
        headers: {
          ...this.headers,
          Referer: "https://www.ai4chat.co/image-pages/ai-text-to-image-generator",
          "Sec-Fetch-Site": "same-origin"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error("Error generating image: " + error.message);
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
  const ai4chat = new AI4chat();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await ai4chat[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await ai4chat[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}