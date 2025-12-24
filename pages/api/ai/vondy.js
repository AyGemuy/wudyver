import axios from "axios";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
class VondyAPI {
  constructor() {
    this.baseUrl = "https://vondyapi-proxy.com";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://www.vondy.com",
      priority: "u=1, i",
      referer: "https://www.vondy.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  _encryptInput(input) {
    const key = CryptoJS.enc.Utf8.parse("1234567890abcdef");
    return CryptoJS.AES.encrypt(input, key, {
      mode: CryptoJS.mode.ECB
    }).toString();
  }
  async _apiCall(endpoint, options = {}, stream = false) {
    try {
      const config = {
        method: options.method || "POST",
        url: `${this.baseUrl}/${endpoint}`,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        },
        data: options.data,
        responseType: stream ? "stream" : "json"
      };
      const response = await axios(config);
      if (stream) {
        return response.data;
      } else {
        return {
          responseData: response.data,
          status: response.status
        };
      }
    } catch (error) {
      console.error("[VondyAPI] API call error:", error);
      throw error;
    }
  }
  async chat({
    prompt,
    bot_id = "8e5fddc2-d5bb-42be-9f63-3142d73ccfd6",
    messages = [],
    ...rest
  }) {
    const chatEndpoint = `bot/${bot_id}/chat-stream-assistant-dfp/`;
    const payload = {
      messages: prompt ? [{
        role: "user",
        content: [{
          type: "text",
          text: prompt
        }]
      }] : messages,
      context: {
        url: rest?.url || ""
      },
      mod: rest?.mod ?? true,
      useCredit: rest?.useCredit ?? true,
      fp: rest?.fp || "",
      isVision: rest?.isVision ?? 1,
      claude: rest?.claude ?? false,
      mini: rest?.mini ?? true,
      variety: rest?.variety ?? true,
      ...rest
    };
    if (rest.inputImageUrl && payload.messages.length > 0) {
      if (Array.isArray(payload.messages[0].content)) {
        payload.messages[0].content.push({
          type: "image_url",
          image_url: {
            url: rest.inputImageUrl
          }
        });
      }
    }
    try {
      const response = await this._apiCall(chatEndpoint, {
        method: "POST",
        headers: {
          accept: "text/event-stream",
          "Content-Type": "application/json"
        },
        data: payload
      }, true);
      return await this._parseStreamResponse(response);
    } catch (error) {
      console.error("[VondyAPI] Chat error:", error);
      throw error;
    }
  }
  async image({
    prompt,
    ...rest
  }) {
    const encryptedInput = this._encryptInput(prompt);
    const payload = {
      model: "text-davinci-003",
      maxTokens: 3e3,
      input: encryptedInput,
      temperature: rest.temperature ?? .5,
      e: true,
      summarizeInput: rest.summarizeInput ?? prompt.length > 300,
      inHTML: rest.inHTML ?? false,
      size: rest.size ?? "1024x1024",
      numImages: rest.numImages ?? 1,
      useCredits: rest.useCredits ?? false,
      titan: rest.titan ?? false,
      quality: rest.quality ?? "standard",
      embedToken: rest.embedToken ?? null,
      edit: rest.edit ?? prompt,
      flux: rest.flux ?? true,
      pro: rest.pro ?? false,
      face: rest.face ?? false,
      useGPT: rest.useGPT ?? false,
      ...rest
    };
    if (rest.inputImageUrl) {
      payload.inputImageUrl = rest.inputImageUrl;
      payload.similarityStrength = rest.similarityStrength ?? .7138044797189446;
      payload.seed = rest.seed ?? 91875;
    }
    try {
      const {
        responseData
      } = await this._apiCall("images/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        data: payload
      });
      return {
        result: responseData?.data || responseData
      };
    } catch (error) {
      console.error("[VondyAPI] Image generation error:", error);
      throw error;
    }
  }
  async _parseStreamResponse(stream) {
    return new Promise((resolve, reject) => {
      let result = "";
      stream.on("data", chunk => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed?.content) {
                result += parsed.content.replace(/\\n/g, "\n");
              }
            } catch (error) {
              result += data.replace(/\\n/g, "\n");
            }
          }
        }
      });
      stream.on("end", () => {
        resolve({
          result: result.trim()
        });
      });
      stream.on("error", error => {
        reject(error);
      });
    });
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
        action: "chat | image"
      }
    });
  }
  const vondy = new VondyAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await vondy[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await vondy[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}