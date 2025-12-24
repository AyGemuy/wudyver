import axios from "axios";
import FormData from "form-data";
class MagiclyAPI {
  constructor() {
    this.baseUrl = "https://core.magicly.ai/v2";
    this.dataUrl = "https://data.magicly.ai";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://magicly.ai",
      priority: "u=1, i",
      referer: "https://magicly.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-device-id": "57509246-f7a6-4e5b-8428-fdfeab434d72",
      "x-language": "id"
    };
  }
  async generate({
    prompt,
    asset = 17423134,
    ...rest
  }) {
    try {
      const result = await this.createRequest({
        asset: asset || this._getDefaultAsset(),
        text: prompt,
        ...rest
      });
      if (rest.waitForCompletion !== false) {
        const completed = await this.waitForRequestCompletion(result.id);
        return completed;
      }
      return result;
    } catch (error) {
      console.error("[MagiclyAPI] Generate error:", error);
      throw error;
    }
  }
  async createRequest({
    asset,
    text,
    strength = .55,
    isManyAssets = true,
    numSteps = 20,
    guidanceScale = 8
  }) {
    try {
      const formData = new FormData();
      formData.append("asset", asset.toString());
      formData.append("text", text);
      formData.append("strength", strength.toString());
      formData.append("isManyAssets", isManyAssets.toString());
      formData.append("numSteps", numSteps.toString());
      formData.append("guidanceScale", guidanceScale.toString());
      const headers = {
        ...this.defaultHeaders,
        "content-type": `multipart/form-data; boundary=${formData.getBoundary()}`,
        ...formData.getHeaders()
      };
      const response = await axios.post(`${this.baseUrl}/requests/james_madison`, formData, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("[MagiclyAPI] Create request error:", error);
      throw error;
    }
  }
  async checkStatus(requestId) {
    try {
      const headers = {
        ...this.defaultHeaders,
        accept: "*/*",
        "if-none-match": 'W/"6b3-tu+T6YNoyYKHcQXCHjxpU6nhOQ8"'
      };
      const response = await axios.get(`${this.baseUrl}/requests/${requestId}`, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("[MagiclyAPI] Check status error:", error);
      throw error;
    }
  }
  async waitForRequestCompletion(requestId, {
    interval = 3e3,
    maxAttempts = 60
  } = {}) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const status = await this.checkStatus(requestId);
        if (status.status === "success") {
          return status;
        } else if (status.status === "failed" || status.status === "error") {
          throw new Error(`Request failed with status: ${status.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error) {
        console.error("[MagiclyAPI] Wait for completion error:", error);
        throw error;
      }
    }
    throw new Error("Request timeout: Maximum attempts reached");
  }
  async trending({
    offset = 0,
    limit = 6,
    conclusion = "images_only",
    exceptions = ""
  } = {}) {
    try {
      const headers = {
        ...this.defaultHeaders,
        "if-none-match": 'W/"295f-MB0aZHl5woun/R6DJHRK/pFPejA"'
      };
      const response = await axios.get(`${this.baseUrl}/feed/trending`, {
        headers: headers,
        params: {
          offset: offset,
          limit: limit,
          conclusion: conclusion,
          exceptions: exceptions
        }
      });
      return response.data;
    } catch (error) {
      console.error("[MagiclyAPI] Trending feed error:", error);
      throw error;
    }
  }
  getResultUrls(result) {
    if (!result || !result.assets) {
      return [];
    }
    return result.assets.filter(asset => asset.status === "success" && asset.url).map(asset => asset.url);
  }
  getThumbnailUrls(result) {
    if (!result || !result.assets) {
      return [];
    }
    return result.assets.filter(asset => asset.status === "success" && asset.thumbnail_url).map(asset => asset.thumbnail_url);
  }
  _getDefaultAsset() {
    return 17423134;
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
        action: "generate | trending"
      }
    });
  }
  const magicly = new MagiclyAPI();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await magicly.generate(params);
        break;
      case "trending":
        result = await magicly.trending(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: generate | trending`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[MagiclyAPI Handler] Error:`, error);
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}