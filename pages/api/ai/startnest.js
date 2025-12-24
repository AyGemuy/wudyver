import axios from "axios";
import CryptoJS from "crypto-js";
class StartNestAPI {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://api.startnest.uk",
      headers: {
        app_name: "AIKEYBOARD"
      }
    });
    this.axiosInstance.interceptors.request.use(config => config, Promise.reject);
    this.axiosInstance.interceptors.response.use(response => response, Promise.reject);
  }
  _authHeader() {
    const epochSecond = Math.floor(Date.now() / 1e3);
    const str = "36ccfe00-78fc-4cab-9c5b-5460b0c78513";
    const validity = "90";
    const combined = `${str}${epochSecond}${validity}`;
    const hash = CryptoJS.SHA256(combined).toString();
    const iVarArr = [{
      key: "kid",
      value: str
    }, {
      key: "algorithm",
      value: "sha256"
    }, {
      key: "timestamp",
      value: String(epochSecond)
    }, {
      key: "validity",
      value: validity
    }, {
      key: "userId",
      value: ""
    }, {
      key: "value",
      value: hash
    }];
    const signature = iVarArr.map(item => `${item.key}=${encodeURIComponent(item.value)}`).join("&");
    return {
      signature: `Signature ${signature}`,
      timestamp: String(epochSecond)
    };
  }
  async image({
    prompt,
    responseFormat = "b64",
    seed = Math.floor(Date.now() / 1e3),
    width = 1024,
    height = 1024,
    ...rest
  }) {
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      throw new Error("A valid string prompt is required for image generation.");
    }
    try {
      const {
        signature
      } = this._authHeader();
      const {
        data
      } = await this.axiosInstance.post("/api/image-generator", {
        prompt: `Realism style of ${prompt} High quality, gorgeous, glamorous, super detail, gorgeous light and shadow, detailed decoration, detailed lines`,
        responseFormat: responseFormat,
        seed: seed,
        size: {
          width: width,
          height: height
        },
        ...rest
      }, {
        headers: {
          Authorization: signature
        }
      });
      let resultData = data.data;
      if (responseFormat === "b64") {
        resultData = Buffer.from(resultData, "base64");
      }
      return {
        result: resultData
      };
    } catch (e) {
      throw e;
    }
  }
  async chat({
    prompt,
    messages,
    model = "gpt-3.5-turbo",
    stream = false,
    ...rest
  }) {
    let chatMessages;
    if (messages?.length > 0) {
      chatMessages = messages;
    } else if (prompt?.trim()) {
      chatMessages = [{
        role: "user",
        content: prompt
      }];
    } else {
      throw new Error("Either a non-empty messages array or a valid prompt string is required for chat completion.");
    }
    try {
      const {
        signature
      } = this._authHeader();
      let apiUrl;
      let requestJson;
      const headers = {
        Authorization: signature
      };
      if (stream) {
        apiUrl = "/api/completions/v2/stream";
        requestJson = {
          isVip: true,
          max_tokens: 2e3,
          messages: chatMessages.map(msg => ({
            ...msg,
            content: [{
              text: msg.content,
              type: "text"
            }]
          })),
          stream: false,
          ...rest
        };
        headers["messagerequestwithpromodel"] = "0";
        headers["chatmodel"] = model.replace(/\./g, "_");
        headers["messagerequest"] = "0";
        headers["isvip"] = "true";
      } else {
        apiUrl = "/api/completions/v1";
        requestJson = {
          model: model,
          messages: chatMessages,
          ...rest
        };
      }
      const {
        data
      } = await this.axiosInstance.post(apiUrl, requestJson, {
        headers: headers
      });
      let result;
      if (stream) {
        const lines = data.split("\n").filter(line => line.startsWith("data:"));
        let streamedContent = "";
        for (const line of lines) {
          if (line.includes("[DONE]")) break;
          try {
            const jsonData = JSON.parse(line.substring(5).trim());
            const content = jsonData.choices[0].message.content;
            if (content) streamedContent += content;
          } catch (error) {}
        }
        result = streamedContent.trim();
      } else {
        result = data.data.choices[0].message.content.trim();
      }
      return {
        result: result
      };
    } catch (e) {
      throw e;
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
        action: "chat | image"
      }
    });
  }
  const api = new StartNestAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await api[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await api[action](params);
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