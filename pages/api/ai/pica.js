import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class PicaAPI {
  constructor(customHeaders = {}) {
    this.baseUrl = "https://api.picaapi.com/aigc";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseUrl,
      jar: this.jar,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        lang: "id",
        from: "web",
        vToken: "koyEbY202aScM74RPIJPq8W1f3ku6TnrdRBG2/0aF2e3xeeKpJPrfEjIqe8LITdHmU1Ar0HQx91Mjn7GJdoDbczoblqXH4Y0XvG3EJsnu0Se02Wkv8COOLCuI1bTHVoeE91D83SpEsXd6sbAmOpYo6hHai5wrLTurUuT8C8M2ts=",
        "Distinct-Id": "194c043341812e-096bced636145e-b457452-412898-194c04334192f",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.artguru.ai/",
        ...customHeaders
      }
    }));
  }
  async request(method, endpoint, payload = {}) {
    try {
      const config = {
        method: method,
        url: endpoint
      };
      if (method === "get") {
        config.params = payload;
      } else {
        config.data = payload;
      }
      const {
        data
      } = await this.client(config);
      return data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
  async chatStream(messages) {
    return await this.request("post", "/multimodal/chat/stream", {
      messages: messages
    });
  }
  async getImageStyles() {
    return await this.request("get", "/image/styles");
  }
  async generateImage(data) {
    return await this.request("post", "/image/generate-or-queue", data);
  }
  async getQueueTask(asyncTaskIds) {
    return await this.request("post", "/image/get-queue-task", {
      asyncTaskIds: Array.isArray(asyncTaskIds) ? asyncTaskIds : [asyncTaskIds]
    });
  }
}
export default async function handler(req, res) {
  const picaApi = new PicaAPI(req.headers);
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  try {
    let result;
    switch (action) {
      case "chat":
        result = await picaApi.chatStream([{
          role: "user",
          content: params.prompt,
          resultType: "normal",
          toolCalls: []
        }, {
          role: "assistant",
          content: "Hello! How can I assist you today?",
          resultType: "normal",
          toolCalls: null
        }]);
        break;
      case "styles":
        result = await picaApi.getImageStyles();
        break;
      case "image":
        if (!params.prompt) return res.status(400).json({
          error: "Prompt is required"
        });
        result = await picaApi.generateImage({
          dbId: params.dbId || "0",
          style: params.style || "default",
          aspectRatio: params.aspectRatio || "1:1",
          width: params.width || 512,
          height: params.height || 512,
          prompt: params.prompt,
          negativePrompt: params.negativePrompt || "",
          image: params.image || "",
          ...params
        });
        break;
      case "status":
        if (!params.ids) return res.status(400).json({
          error: "taskIds are required"
        });
        const taskIds = params.ids.includes(",") ? params.ids.split(",") : [params.ids];
        result = await picaApi.getQueueTask(taskIds);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error
    });
  }
}