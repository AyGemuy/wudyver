import axios from "axios";
class RedPillChat {
  constructor() {
    this.apiBaseUrl = "https://api.red-pill.ai/v1/chat/completions";
    this.modelsApiBaseUrl = "https://redpill.ai/api/trpc/models.list";
    this.apiKey = "test";
  }
  async chat({
    prompt,
    messages = [],
    model = "openai/gpt-3.5-turbo",
    stream = false,
    ...rest
  }) {
    const messagesToSend = messages.length > 0 ? messages : [{
      role: "user",
      content: prompt
    }];
    try {
      const response = await axios.post(this.apiBaseUrl, {
        model: model,
        stream: stream,
        messages: messagesToSend,
        ...rest
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          authorization: `Bearer ${this.apiKey}`,
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://redpill.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://redpill.ai/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error during chat completion:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async model({
    take = 20,
    skip = 0,
    query = "",
    verifiable = false,
    ...rest
  }) {
    const inputParam = encodeURIComponent(JSON.stringify({
      0: {
        json: {
          take: take,
          skip: skip,
          keyword: query,
          verifiable: verifiable
        }
      }
    }));
    const requestUrl = `${this.modelsApiBaseUrl}?batch=1&input=${inputParam}`;
    try {
      const response = await axios.get(requestUrl, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://redpill.ai/models?keyword=gemini",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "trpc-accept": "application/jsonl",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "x-trpc-source": "nextjs-react",
          ...rest
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching models:", error.response ? error.response.data : error.message);
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
        action: "chat | model"
      }
    });
  }
  const redPill = new RedPillChat();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: 'prompt' (required for ${action})`
          });
        }
        result = await redPill[action](params);
        break;
      case "model":
        result = await redPill[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | model`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`API processing error for action "${action}":`, error);
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
    return res.status(statusCode).json({
      success: false,
      error: `Processing error: ${errorMessage}`
    });
  }
}