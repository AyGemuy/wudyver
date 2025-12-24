import fetch from "node-fetch";
import ApiKey from "@/configs/api-key";
class AIClient {
  constructor() {
    this.apiKey = ApiKey.openai?.[3];
    this.baseUrl = "https://api.openai.com/v1";
    this.endpoints = {
      chat: "/chat/completions",
      img: "/images/generations"
    };
    this.defaultModels = {
      chat: "gpt-3.5-turbo",
      img: "dall-e-3"
    };
    this.defaults = {
      chat: {
        temperature: .7,
        max_tokens: 1024,
        stream: false
      },
      img: {
        n: 1,
        size: "1024x1024",
        temperature: null
      }
    };
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
  }
  async req(url, options) {
    console.log(`[LOG] → ${options.method} ${url}`);
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        let errMsg = `Status: ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err?.error?.message || errMsg;
        } catch {}
        console.error(`[ERROR] API: ${errMsg}`);
        throw new Error(errMsg);
      }
      return res;
    } catch (e) {
      console.error(`[ERROR] Fetch: ${e.message}`);
      throw e;
    }
  }
  async gen({
    mode = "chat",
    prompt = "",
    messages = [],
    ...rest
  }) {
    if (!["chat", "img"].includes(mode)) {
      throw new Error(`Mode tidak valid: ${mode}. Gunakan 'chat' atau 'img'`);
    }
    const model = rest.model || this.defaultModels[mode];
    const url = this.baseUrl + this.endpoints[mode];
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    };
    const msgs = messages.length > 0 ? messages : [{
      role: "user",
      content: prompt || "Hello"
    }];
    const defaultConfig = {
      ...this.defaults[mode]
    };
    let body = {};
    if (mode === "chat") {
      body = {
        model: model,
        messages: msgs,
        temperature: rest.temperature ?? defaultConfig.temperature,
        max_tokens: rest.max_tokens ?? defaultConfig.max_tokens,
        stream: rest.stream ?? defaultConfig.stream,
        ...rest
      };
    }
    if (mode === "img") {
      body = {
        model: model,
        prompt: prompt || msgs[0]?.content || "A beautiful scene",
        n: 1,
        size: rest.size || defaultConfig.size,
        ...rest
      };
      delete body.messages;
      delete body.max_tokens;
      delete body.temperature;
      delete body.stream;
    }
    const res = await this.req(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    if (rest.stream) {
      console.log("[LOG] Streaming response...");
      return res.body;
    }
    return await res.json();
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new AIClient();
    const response = await api.gen(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}