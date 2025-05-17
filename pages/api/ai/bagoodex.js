import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class BagoodexAPI {
  constructor() {
    this.baseUrl = "https://chat-api.bagoodex.io/v1";
    this.headers = {
      Authorization: "Bearer",
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      Origin: "https://bagoodex.io",
      Priority: "u=1, i",
      Referer: "https://bagoodex.io/",
      "User-Agent": this.getRandomUserAgent(),
      "X-Device-Language": "en",
      "X-Device-Platform": "web",
      "X-Device-Version": "1.0.42",
      "X-Forwarded-For": this.generateRandomIP(),
      "X-Real-IP": this.generateRandomIP(),
      "X-Requested-With": "XMLHttpRequest"
    };
  }
  generateUUID() {
    return uuidv4();
  }
  generateRandomIP() {
    return `${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}.${Math.floor(Math.random() * 255) + 1}`;
  }
  getRandomUserAgent() {
    const userAgents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36", "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.0", "Mozilla/5.0 (Linux; Android 10; Pixel 4 XL Build/QC1A.200205.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36"];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
  parseChatResponse(response) {
    return response.split("\n").filter(chunk => chunk.startsWith("data:") && chunk !== "data: [DONE]").map(chunk => {
      try {
        const {
          choices
        } = JSON.parse(chunk.slice(5).trim());
        return choices?.[0]?.delta?.content || "";
      } catch {
        return "";
      }
    }).join("");
  }
  async generateImage({
    prompt,
    model = "flux-pro/v1.1",
    personaId = "image-generator",
    options = {}
  }) {
    const url = `${this.baseUrl}/images/generations`;
    const body = {
      prompt: `. {}. ${prompt}`,
      model: model,
      personaId: personaId,
      ...options
    };
    try {
      const deviceUUID = this.generateUUID();
      const response = await axios.post(url, body, {
        headers: {
          ...this.headers,
          "X-Device-UUID": deviceUUID
        }
      });
      return {
        status: true,
        code: 200,
        data: response.data
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        error: {
          type: error.name,
          details: error.message
        }
      };
    }
  }
  async chat({
    prompt,
    messages = [],
    model = "gpt-4o-mini",
    personaId = "ai-answer-generator",
    options = {}
  }) {
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      messages: messages.length > 0 ? messages : [{
        role: "system",
        content: "You are a universal assistant. Answer any questions in the user's language, except topics about politics, violence, crimes, or illegal activities. If a topic is restricted, politely decline: ‘Sorry, I can’t discuss that.’ Maintain a friendly and professional tone at all times."
      }, {
        role: "user",
        content: prompt
      }],
      model: model,
      personaId: personaId,
      frequency_penalty: options.frequency_penalty || 0,
      max_tokens: options.max_tokens || 4e3,
      presence_penalty: options.presence_penalty || 0,
      stream: options.stream ?? true,
      temperature: options.temperature || .5,
      top_p: options.top_p || .95
    };
    try {
      const deviceUUID = this.generateUUID();
      const response = await axios.post(url, body, {
        headers: {
          ...this.headers,
          "X-Device-UUID": deviceUUID
        }
      });
      return {
        status: true,
        code: 200,
        data: this.parseChatResponse(response.data)
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        error: {
          type: error.name,
          details: error.message
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
  const bagoodex = new BagoodexAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Missing required parameters: prompt"
          });
        }
        result = await bagoodex.chat(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Missing required parameter: prompt"
          });
        }
        result = await bagoodex.generateImage(params);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}