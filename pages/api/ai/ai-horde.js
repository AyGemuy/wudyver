import axios from "axios";
class AiHorde {
  constructor({
    apiKey = "0000000000"
  } = {}) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: "https://aihorde.net/api/v2",
      headers: {
        "Content-Type": "application/json",
        apikey: this.apiKey
      },
      timeout: 3e4
    });
  }
  async request(endpoint, {
    method = "GET",
    data = null
  } = {}) {
    try {
      const response = await this.client.request({
        url: endpoint,
        method: method,
        data: data
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error("An error occurred with the request:", `Status: ${error.response.status}`, error.response.data);
      } else if (error.request) {
        console.error("No response received for the request:", error.request);
      } else {
        console.error("Error setting up the request:", error.message);
      }
      return null;
    }
  }
  async models() {
    return await this.request("/status/models");
  }
  async styles() {
    try {
      const response = await axios.get("https://raw.githubusercontent.com/db0/Stable-Horde-Styles/main/styles.json");
      return response.data;
    } catch (error) {
      console.error("Error fetching styles:", error.message);
      return null;
    }
  }
  async pollGenerationStatus(id, isText = false) {
    const startTime = Date.now();
    const timeout = 12e4;
    while (Date.now() - startTime < timeout) {
      try {
        const statusEndpoint = isText ? `/generate/text/status/${id}` : `/generate/status/${id}`;
        const checkEndpoint = isText ? statusEndpoint : `/generate/check/${id}`;
        const checkData = await this.request(checkEndpoint);
        console.log(`Polling status... K-steps: ${checkData.kudos}, Selesai: ${checkData.done || checkData.finished}`);
        if (checkData?.finished || checkData?.done) {
          return await this.request(statusEndpoint);
        }
        await new Promise(resolve => setTimeout(resolve, isText ? 1e3 : 5e3));
      } catch (error) {
        console.error("Error while polling generation status:", error);
        return null;
      }
    }
    console.warn("Generation timeout.");
    return null;
  }
  async image({
    prompt,
    negativePrompt = "",
    messages,
    model,
    ...rest
  }) {
    try {
      const payload = {
        prompt: `${prompt}${negativePrompt ? ` ### ${negativePrompt}` : ""}`,
        params: {
          ...rest
        },
        model: model,
        ...messages?.length && {
          source_processing: "prompt",
          messages: messages
        }
      };
      const initialResponse = await this.request("/generate/async", {
        method: "POST",
        data: payload
      });
      console.log("Initial image generation response:", initialResponse);
      const generationId = initialResponse?.id;
      if (!generationId) {
        console.error("Failed to get a generation ID for the image.");
        return null;
      }
      return await this.pollGenerationStatus(generationId, false);
    } catch (error) {
      console.error("An error occurred in image():", error);
      return null;
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    try {
      const payload = {
        prompt: prompt,
        params: {
          ...rest
        },
        ...messages?.length && {
          messages: messages
        }
      };
      const initialResponse = await this.request("/generate/text/async", {
        method: "POST",
        data: payload
      });
      console.log("Initial chat generation response:", initialResponse);
      const generationId = initialResponse?.id;
      if (!generationId) {
        console.error("Failed to get a generation ID for the chat.");
        return null;
      }
      return await this.pollGenerationStatus(generationId, true);
    } catch (error) {
      console.error("An error occurred in chat():", error);
      return null;
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
      error: "Action is required."
    });
  }
  const api = new AiHorde();
  try {
    let response;
    switch (action) {
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for image."
          });
        }
        response = await api.image(params);
        return res.status(200).json(response);
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for chat."
          });
        }
        response = await api.chat(params);
        return res.status(200).json(response);
      case "models":
        response = await api.models();
        return res.status(200).json(response);
      case "styles":
        response = await api.styles();
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'image', 'chat', 'models', and 'styles'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}