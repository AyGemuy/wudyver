import fetch from "node-fetch";
import ApiKey from "@/configs/api-key";
const AVAILABLE_ACTIONS = ["chat", "image_gen", "embeddings", "check_key", "models", "credits", "completions"];
class OpenRouterAPI {
  constructor() {
    this.config = {
      baseUrl: "https://openrouter.ai/api/v1",
      keys: ApiKey.openrouter,
      defaultPayload: {
        model: "openai/gpt-4o",
        temperature: .7,
        max_tokens: 1e3
      },
      endpoints: {
        chat: "/chat/completions",
        embeddings: "/embeddings",
        models: "/models",
        credits: "/credits",
        authKey: "/auth/key"
      }
    };
  }
  async safeRequest(url, method, payload = null, customHeaders = {}) {
    let lastResult = null;
    let attempt = 0;
    for (const apiKey of this.config.keys) {
      attempt++;
      try {
        console.log(`[Request] Attempt ${attempt} using key ending ...${apiKey.slice(-5)}`);
        const options = {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...customHeaders
          }
        };
        if (payload) {
          options.body = JSON.stringify(payload);
        }
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 402) {
          console.warn(`[Key Failed] Status ${response.status}. Switching to next key...`);
          const errorData = await response.json().catch(() => ({
            error: "Unknown error"
          }));
          lastResult = {
            status: response.status,
            data: errorData
          };
          continue;
        }
        const data = await response.json();
        return {
          status: response.status,
          data: data
        };
      } catch (error) {
        console.error(`[Network Error] Key ...${apiKey.slice(-5)}: ${error.message}`);
        lastResult = {
          status: 500,
          data: {
            error: {
              message: error.message,
              type: "network_error"
            }
          }
        };
        continue;
      }
    }
    return lastResult || {
      status: 500,
      data: {
        error: {
          message: "All API keys exhausted or failed."
        }
      }
    };
  }
  async chat(params) {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoints.chat}`;
      const payload = {
        model: params.model || this.config.defaultPayload.model,
        messages: params.messages || [{
          role: "user",
          content: params.prompt
        }],
        ...params
      };
      delete payload.prompt;
      delete payload.action;
      return await this.safeRequest(url, "POST", payload);
    } catch (error) {
      console.error("[Class Error] chat:", error);
      return {
        status: 500,
        data: {
          error: {
            message: "Internal Class Error during Chat preparation"
          }
        }
      };
    }
  }
  async generateImage(params) {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoints.chat}`;
      const payload = {
        model: params.model || "google/gemini-2.5-flash-image-preview",
        messages: [{
          role: "user",
          content: params.prompt
        }],
        modalities: ["image", "text"],
        image_config: params.image_config
      };
      return await this.safeRequest(url, "POST", payload);
    } catch (error) {
      console.error("[Class Error] generateImage:", error);
      return {
        status: 500,
        data: {
          error: {
            message: "Internal Class Error during Image Gen preparation"
          }
        }
      };
    }
  }
  async embeddings(params) {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoints.embeddings}`;
      const payload = {
        model: params.model || "openai/text-embedding-3-small",
        input: params.input
      };
      return await this.safeRequest(url, "POST", payload);
    } catch (error) {
      console.error("[Class Error] embeddings:", error);
      return {
        status: 500,
        data: {
          error: {
            message: "Internal Class Error during Embeddings preparation"
          }
        }
      };
    }
  }
  async checkKeyInfo() {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoints.authKey}`;
      return await this.safeRequest(url, "GET");
    } catch (error) {
      console.error("[Class Error] checkKeyInfo:", error);
      return {
        status: 500,
        data: {
          error: {
            message: "Internal Class Error during Key Check"
          }
        }
      };
    }
  }
  async getModels() {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoints.models}`;
      return await this.safeRequest(url, "GET");
    } catch (error) {
      console.error("[Class Error] getModels:", error);
      return {
        status: 500,
        data: {
          error: {
            message: "Internal Class Error during Get Models"
          }
        }
      };
    }
  }
  async getCredits() {
    try {
      const url = `${this.config.baseUrl}${this.config.endpoints.credits}`;
      return await this.safeRequest(url, "GET");
    } catch (error) {
      console.error("[Class Error] getCredits:", error);
      return {
        status: 500,
        data: {
          error: {
            message: "Internal Class Error during Get Credits"
          }
        }
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
      error: {
        message: "Parameter 'action' is required.",
        available_actions: AVAILABLE_ACTIONS
      }
    });
  }
  const api = new OpenRouterAPI();
  let result;
  try {
    switch (action) {
      case "chat":
        result = await api.chat(params);
        break;
      case "image_gen":
        if (!params.prompt) return res.status(400).json({
          error: {
            message: "Prompt is required for image_gen"
          }
        });
        result = await api.generateImage(params);
        break;
      case "embeddings":
        if (!params.input) return res.status(400).json({
          error: {
            message: "Input is required for embeddings"
          }
        });
        result = await api.embeddings(params);
        break;
      case "check_key":
        result = await api.checkKeyInfo();
        break;
      case "models":
        result = await api.getModels();
        break;
      case "credits":
        result = await api.getCredits();
        break;
      case "completions":
        result = await api.chat({
          ...params,
          model: params.model || "openai/gpt-3.5-turbo-instruct"
        });
        break;
      default:
        return res.status(400).json({
          error: {
            message: `Invalid action: '${action}'`,
            available_actions: AVAILABLE_ACTIONS
          }
        });
    }
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Internal Handler Error:", error);
    return res.status(500).json({
      error: {
        message: "Internal Server Error",
        details: error.message
      }
    });
  }
}