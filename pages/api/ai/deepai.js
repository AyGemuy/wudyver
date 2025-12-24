import axios from "axios";
import {
  FormData
} from "formdata-node";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class DeepAI {
  constructor() {
    this.baseURL = "https://api.deepai.org";
    this.userAgent = this.genUA();
  }
  genUA() {
    const android = [10, 11, 12, 13, 14][Math.floor(Math.random() * 5)];
    const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" [Math.floor(Math.random() * 26)];
    const chrome = [120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131][Math.floor(Math.random() * 12)];
    return `Mozilla/5.0 (Linux; Android ${android}; ${letter}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome}.0.0.0 Mobile Safari/537.36`;
  }
  hashFunction(input) {
    return crypto.createHash("md5").update(input).digest("hex").split("").reverse().join("");
  }
  genKey() {
    const randomStr = Math.round(Math.random() * 1e11) + "";
    const secret = "hackers_become_a_little_stinkier_every_time_they_hack";
    const hash = this.hashFunction(this.userAgent + this.hashFunction(this.userAgent + this.hashFunction(this.userAgent + randomStr + secret)));
    return "tryit-" + randomStr + "-" + hash;
  }
  async request(endpoint, data, extraHeaders = {}) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
      });
      const headers = {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "api-key": this.genKey() || "9fc3ed1a-04f7-40ef-bbdb-2d51765ff78f",
        origin: this.baseURL,
        referer: `${this.baseURL}/`,
        "user-agent": this.userAgent,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-request-id": crypto.randomBytes(8).toString("hex"),
        ...SpoofHead(),
        ...extraHeaders,
        ...formData.headers
      };
      const response = await axios.post(`${this.baseURL}${endpoint}`, formData, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error(`Error in request to ${endpoint}:`, error);
      throw error;
    }
  }
  async chat({
    prompt,
    messages = [],
    chatStyle = "chat",
    model = "standard"
  }) {
    try {
      const result = await this.request("/hacking_is_a_serious_crime", {
        chat_style: chatStyle,
        chatHistory: messages.length ? messages : [{
          role: "user",
          content: prompt
        }],
        model: model,
        hacker_is_stinky: "very_stinky"
      });
      return {
        result: result
      };
    } catch (error) {
      console.error("Error in chat:", error);
      throw error;
    }
  }
  async image({
    prompt: text,
    version = "hd"
  }) {
    try {
      return await this.request("/api/text2img", {
        text: text,
        image_generator_version: version
      });
    } catch (error) {
      console.error("Error in image:", error);
      throw error;
    }
  }
  async video({
    prompt,
    dimensions = "default"
  }) {
    try {
      return await this.request("/generate_video", {
        textPrompt: prompt,
        dimensions: dimensions
      });
    } catch (error) {
      console.error("Error in video:", error);
      throw error;
    }
  }
  async audio({
    prompt: text
  }) {
    try {
      return await this.request("/audio_response", {
        text: text
      }, {
        "content-type": "application/json"
      });
    } catch (error) {
      console.error("Error in audio:", error);
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
        action: "chat | image | video | audio"
      }
    });
  }
  const deepai = new DeepAI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await deepai[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await deepai[action](params);
        break;
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await deepai[action](params);
        break;
      case "audio":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await deepai[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image | video | audio`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}