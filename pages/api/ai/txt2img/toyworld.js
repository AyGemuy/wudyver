import axios from "axios";
import {
  EventSource
} from "eventsource";
class YntecToyworld {
  constructor() {
    this.baseUrl = "https://yntec-toyworld.hf.space";
    this.sessionHash = Math.random().toString(36).slice(2);
  }
  decode(encodedUrl) {
    try {
      let decoded = encodedUrl;
      while (decodeURIComponent(decoded) !== decoded) {
        decoded = decodeURIComponent(decoded);
      }
      return decoded;
    } catch (e) {
      return encodedUrl;
    }
  }
  async models() {
    try {
      const res = await axios.get("https://huggingface.co/api/spaces/by-subdomain/yntec-toyworld", {
        headers: {
          accept: "*/*",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`
        }
      });
      return res.data;
    } catch (e) {
      throw new Error(`[getModels] ${e.message}`);
    }
  }
  async create({
    model = "Yntec/CremeCaramel",
    prompt,
    seed = Math.floor(Math.random() * 1e6)
  }) {
    const decodedModel = this.decode(model);
    const decodedPrompt = this.decode(prompt);
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/run/predict`, {
        data: [decodedModel, decodedPrompt, seed],
        event_data: null,
        fn_index: 10,
        trigger_id: 13651,
        session_hash: this.sessionHash
      }, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`
        }
      });
      return data;
    } catch (e) {
      throw new Error(`[createTask] ${e.message}`);
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
        action: "create | models"
      }
    });
  }
  const toyworld = new YntecToyworld();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await toyworld[action](params);
        break;
      case "models":
        result = await toyworld[action]();
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: create | models`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}