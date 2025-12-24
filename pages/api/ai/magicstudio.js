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
      origin: "https://magicstudio.com",
      referer: "https://magicstudio.com/",
      "user-agent": "Mozilla/5.0"
    };
  }
  async eraseImage({
    url: imageUrl,
    output = "url"
  }) {
    try {
      const formData = new FormData();
      const imageBuffer = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      formData.append("image", new Blob([imageBuffer.data], {
        type: "image/jpeg"
      }));
      formData.append("areas", JSON.stringify([]));
      formData.append("output_type", "image");
      formData.append("output_format", output);
      formData.append("anonymous_user_id", "null");
      formData.append("user_id", "ba70f96a-04ca-4bed-96df-263258f18ef1");
      formData.append("request_timestamp", `${Date.now() / 1e3}`);
      formData.append("user_is_subscribed", "false");
      formData.append("client_id", "none");
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
  async removeBg({
    url: imageUrl,
    output = "url"
  }) {
    try {
      const formData = new FormData();
      const imageBuffer = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      formData.append("image", new Blob([imageBuffer.data], {
        type: "image/jpeg"
      }));
      formData.append("output_type", "image");
      formData.append("output_format", output);
      formData.append("anonymous_user_id", "null");
      formData.append("user_id", "ba70f96a-04ca-4bed-96df-263258f18ef1");
      formData.append("request_timestamp", `${Date.now() / 1e3}`);
      formData.append("user_is_subscribed", "false");
      formData.append("client_id", "none");
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
  async generateArt({
    prompt,
    output = "url"
  }) {
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("output_format", output);
      formData.append("anonymous_user_id", "null");
      formData.append("user_id", "ba70f96a-04ca-4bed-96df-263258f18ef1");
      formData.append("request_timestamp", `${Date.now() / 1e3}`);
      formData.append("user_is_subscribed", "false");
      formData.append("client_id", "none");
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
  async convertImage({
    url: imageUrl,
    format: newFormat = "png"
  }) {
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
  erase: "eraseImage",
  bg: "removeBg",
  art: "generateArt",
  convert: "convertImage"
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
        if (!params.url) return res.status(400).json({
          error: "Missing parameter: url"
        });
        result = await magicStudio.eraseImage(params);
        break;
      case "bg":
        if (!params.url) return res.status(400).json({
          error: "Missing parameter: url"
        });
        result = await magicStudio.removeBg(params);
        break;
      case "art":
        if (!params.prompt) return res.status(400).json({
          error: "Missing parameter: prompt"
        });
        result = await magicStudio.generateArt(params);
        break;
      case "convert":
        if (!params.url) return res.status(400).json({
          error: "Missing parameter: url"
        });
        result = await magicStudio.convertImage(params);
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