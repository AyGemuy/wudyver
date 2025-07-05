import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class SunoApiOrgService {
  constructor() {
    const apiKey = apiConfig.SUNOAPI_KEY;
    if (!apiKey) {
      throw new Error("SUNOAPI_KEY environment variable is not set.");
    }
    this.axiosInstance = axios.create({
      baseURL: "https://api.sunoapi.org/api/v1",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`
      }
    });
  }
  async generateMusic({
    prompt = "",
    style = "",
    title = "",
    customMode = false,
    instrumental = false,
    model = "V3_5",
    negativeTags = "",
    callBackUrl = ""
  }) {
    try {
      const payload = {
        prompt: prompt,
        style: style,
        title: title,
        customMode: customMode,
        instrumental: instrumental,
        model: model,
        negativeTags: negativeTags,
        callBackUrl: callBackUrl
      };
      if (!callBackUrl) {
        throw new Error("Missing required parameter: callBackUrl.");
      }
      if (!model) {
        throw new Error("Missing required parameter: model.");
      }
      if (customMode) {
        if (!style) {
          throw new Error("Custom Mode: Missing required parameter: style.");
        }
        if (!title) {
          throw new Error("Custom Mode: Missing required parameter: title.");
        }
        if (!instrumental && !prompt) {
          throw new Error("Custom Mode: If instrumental is false, prompt (lyrics) is required.");
        }
      } else {
        if (!prompt) {
          throw new Error("Non-custom Mode: prompt is always required.");
        }
        if (style || title || negativeTags) {
          console.warn("Non-custom Mode: 'style', 'title', and 'negativeTags' should be left empty. Ignoring them.");
          payload.style = "";
          payload.title = "";
          payload.negativeTags = "";
        }
      }
      const response = await this.axiosInstance.post("/generate", payload);
      if (response.data.code !== 200) {
        throw new Error(response.data.msg || "Music generation request failed.");
      }
      return response.data;
    } catch (error) {
      console.error("Error generating music:", error.response?.data || error.message);
      throw new Error(error.response?.data?.msg || error.message || "Failed to generate music.");
    }
  }
  async getMusicDetails(taskId) {
    try {
      if (!taskId) {
        throw new Error("Missing required parameter: taskId.");
      }
      const response = await this.axiosInstance.get(`/get?task_id=${taskId}`);
      if (response.data.code !== 200) {
        throw new Error(response.data.msg || "Failed to get music details.");
      }
      return response.data;
    } catch (error) {
      console.error("Error getting music details:", error.response?.data || error.message);
      throw new Error(error.response?.data?.msg || error.message || "Failed to get music details.");
    }
  }
  async extendMusic({
    continue_clip_id,
    continue_at,
    prompt = "",
    style = "",
    title = "",
    customMode = false,
    instrumental = false,
    model = "V3_5",
    negativeTags = "",
    callBackUrl = ""
  }) {
    try {
      if (!continue_clip_id) {
        throw new Error("Missing required parameter: continue_clip_id.");
      }
      if (typeof continue_at !== "number") {
        throw new Error("Missing or invalid parameter: continue_at (must be a number).");
      }
      if (!callBackUrl) {
        throw new Error("Missing required parameter: callBackUrl.");
      }
      if (!model) {
        throw new Error("Missing required parameter: model.");
      }
      const payload = {
        continue_clip_id: continue_clip_id,
        continue_at: continue_at,
        prompt: prompt,
        style: style,
        title: title,
        customMode: customMode,
        instrumental: instrumental,
        model: model,
        negativeTags: negativeTags,
        callBackUrl: callBackUrl
      };
      if (customMode) {
        if (!style) {
          throw new Error("Custom Mode: Missing required parameter: style.");
        }
        if (!title) {
          throw new Error("Custom Mode: Missing required parameter: title.");
        }
        if (!instrumental && !prompt) {
          throw new Error("Custom Mode: If instrumental is false, prompt (lyrics) is required.");
        }
      } else {
        if (!prompt) {
          throw new Error("Non-custom Mode: prompt is always required.");
        }
        if (style || title || negativeTags) {
          console.warn("Non-custom Mode: 'style', 'title', and 'negativeTags' should be left empty. Ignoring them.");
          payload.style = "";
          payload.title = "";
          payload.negativeTags = "";
        }
      }
      const response = await this.axiosInstance.post("/extend", payload);
      if (response.data.code !== 200) {
        throw new Error(response.data.msg || "Music extension request failed.");
      }
      return response.data;
    } catch (error) {
      console.error("Error extending music:", error.response?.data || error.message);
      throw new Error(error.response?.data?.msg || error.message || "Failed to extend music.");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new SunoApiOrgService();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.callBackUrl) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameter: callBackUrl"
          });
        }
        if (!params.model) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameter: model"
          });
        }
        if (typeof params.customMode !== "boolean" || typeof params.instrumental !== "boolean") {
          return res.status(400).json({
            success: false,
            message: "Parameters 'customMode' and 'instrumental' must be boolean."
          });
        }
        result = await api.generateMusic(params);
        break;
      case "getDetails":
        if (!params.taskId) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameter: taskId"
          });
        }
        result = await api.getMusicDetails(params.taskId);
        break;
      case "extend":
        if (!params.continue_clip_id) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameter: continue_clip_id"
          });
        }
        if (typeof params.continue_at === "undefined" || typeof params.continue_at !== "number") {
          return res.status(400).json({
            success: false,
            message: "Missing or invalid parameter: continue_at (must be a number)"
          });
        }
        if (!params.callBackUrl) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameter: callBackUrl"
          });
        }
        if (!params.model) {
          return res.status(400).json({
            success: false,
            message: "Missing required parameter: model"
          });
        }
        if (typeof params.customMode !== "boolean" || typeof params.instrumental !== "boolean") {
          return res.status(400).json({
            success: false,
            message: "Parameters 'customMode' and 'instrumental' must be boolean."
          });
        }
        result = await api.extendMusic(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Action tidak valid. Gunakan ?action=generate, ?action=getDetails, atau ?action=extend."
        });
    }
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error"
    });
  }
}