import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class MagicStudio {
  constructor() {
    this.eraseApiUrl = "https://ai-api.magicstudio.com/api/magic-erase/upload";
    this.removeBgApiUrl = "https://ai-api.magicstudio.com/api/remove-background";
    this.artGenApiUrl = "https://ai-api.magicstudio.com/api/ai-art-generator";
    this.convertFormatApiUrl = "https://api.magicstudio.com/studio/tools/change-format/";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://magicstudio.com",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async erase(imageUrl) {
    try {
      const formData = new FormData();
      const imageBuffer = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      formData.append("image", new Blob([imageBuffer.data], {
        type: "image/jpeg"
      }));
      formData.append("areas", JSON.stringify([]));
      formData.append("auto_delete_data", true);
      const response = await axios.post(this.eraseApiUrl, formData, {
        headers: {
          ...this.headers
        }
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async removeBackground(imageUrl) {
    try {
      const formData = new FormData();
      const imageBuffer = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      formData.append("image", new Blob([imageBuffer.data], {
        type: "image/jpeg"
      }));
      formData.append("output_type", "image");
      formData.append("output_format", "url");
      formData.append("auto_delete_data", true);
      formData.append("user_profile_id", null);
      formData.append("anonymous_user_id", "5ea96ca3-a2e0-4efb-960f-fb5783671601");
      formData.append("request_timestamp", Date.now() / 1e3);
      formData.append("user_is_subscribed", false);
      formData.append("client_id", "pSgX7WgjukXCBoYwDM8G8GLnRRkvAoJlqa5eAVvj95o");
      const response = await axios.post(this.removeBgApiUrl, formData, {
        headers: {
          ...this.headers
        }
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async generateArt(prompt) {
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("output_format", "bytes");
      formData.append("user_profile_id", null);
      formData.append("anonymous_user_id", "5ea96ca3-a2e0-4efb-960f-fb5783671601");
      formData.append("request_timestamp", Date.now() / 1e3);
      formData.append("user_is_subscribed", false);
      formData.append("client_id", "pSgX7WgjukXCBoYwDM8G8GLnRRkvAoJlqa5eAVvj95o");
      const response = await axios.post(this.artGenApiUrl, formData, {
        headers: {
          ...this.headers
        }
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  async convertImageFormat(imageUrl, newFormat = "png") {
    try {
      const response = await axios.get(`${this.convertFormatApiUrl}?image_url=${encodeURIComponent(imageUrl)}&new_format=${newFormat}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
const actions = {
  erase: "erase",
  bg: "removeBackground",
  art: "generateArt",
  convert: "convertImageFormat"
};
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    if (!action || !actions[action]) {
      return res.status(400).json({
        error: "Invalid action. Available actions:",
        actions: Object.keys(actions)
      });
    }
    const magicStudio = new MagicStudio();
    let result;
    switch (action) {
      case "erase":
        if (!params.image) return res.status(400).json({
          error: "Missing parameter: image"
        });
        result = await magicStudio.erase(params.image);
        break;
      case "bg":
        if (!params.image) return res.status(400).json({
          error: "Missing parameter: image"
        });
        result = await magicStudio.removeBackground(params.image);
        break;
      case "art":
        if (!params.prompt) return res.status(400).json({
          error: "Missing parameter: prompt"
        });
        result = await magicStudio.generateArt(params.prompt);
        break;
      case "convert":
        if (!params.image) return res.status(400).json({
          error: "Missing parameter: image"
        });
        result = await magicStudio.convertImageFormat(params.image, params.format || "png");
        break;
      default:
        return res.status(400).json({
          error: `Unsupported action: ${action}`
        });
    }
    if (Buffer.isBuffer(result)) {
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(result);
    }
    if (typeof result === "string" && result.startsWith("data:image")) {
      const buffer = Buffer.from(result.split(",")[1], "base64");
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(buffer);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}