import axios from "axios";
class ShapesAPI {
  constructor() {
    this.baseUrl = "https://shapes.inc/api";
    this.anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      priority: "u=1, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async getMimeTypeFromUrl(url) {
    try {
      const response = await axios.head(url, {
        timeout: 5e3
      });
      return response.headers["content-type"] || null;
    } catch (error) {
      console.warn(`Could not determine MIME type for ${url}:`, error.message);
      return null;
    }
  }
  async search({
    query = "",
    sort_by = "desc_global_users",
    search_type = "vibe_search",
    ...rest
  }) {
    try {
      const params = {
        q: query,
        sort_by: sort_by,
        search_type: search_type,
        ...rest
      };
      const response = await axios.get(`${this.baseUrl}/shapes/search`, {
        params: params,
        headers: {
          ...this.commonHeaders,
          referer: `https://shapes.inc/explore?q=${query}&search_type=${search_type}`
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error during search:", error);
      throw error;
    }
  }
  async getShapeDetails(charId) {
    try {
      const response = await axios.get(`${this.baseUrl}/public/shapes/${charId}`, {
        headers: {
          ...this.commonHeaders,
          referer: `https://shapes.inc/${charId}/chat`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting details for ${charId}:`, error);
      throw error;
    }
  }
  async chat({
    char_id = "meiko-144l",
    prompt = "",
    url = null,
    audio = false,
    ...rest
  }) {
    let shapeId;
    try {
      const shapeDetails = await this.getShapeDetails(char_id);
      shapeId = shapeDetails.id;
    } catch (error) {
      console.error(`Could not retrieve shapeId for char_id: ${char_id}. Falling back to dynamic ID.`, error);
      shapeId = `shape_dynamic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    let attachmentType = null;
    if (url) {
      attachmentType = await this.getMimeTypeFromUrl(url);
    }
    try {
      const response = await axios.post(`${this.baseUrl}/public/shapes/${char_id}/chat`, {
        message: prompt,
        shapeId: shapeId,
        attachment_url: url,
        attachment_type: attachmentType,
        is_audio: audio,
        ...rest
      }, {
        headers: {
          ...this.commonHeaders,
          "content-type": "application/json",
          origin: "https://shapes.inc",
          referer: `https://shapes.inc/${char_id}/chat`,
          "x-anonymous-id": this.anonymousId
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error during chat:", error);
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
      error: "Missing required field: action",
      required: {
        action: "chat | search"
      }
    });
  }
  const client = new ShapesAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await client[action](params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await client[action](params);
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