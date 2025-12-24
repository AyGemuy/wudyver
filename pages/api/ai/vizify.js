import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  v4 as uuidv4
} from "uuid";
class Vizify {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "sec-ch-ua-platform": '"Android"',
        "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        referer: "https://www.vizify.ai/id/chat",
        "accept-language": "id,ms;q=0.9,en;q=0.8",
        priority: "u=1, i",
        origin: "https://www.vizify.ai"
      }
    }));
    this.isAuth = false;
  }
  log(msg, type = "info") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type.toUpperCase()}] ${msg}`);
  }
  async getCsrf() {
    try {
      const res = await this.client.get("https://www.vizify.ai/api/auth/csrf");
      return res.data?.csrfToken || null;
    } catch (e) {
      this.log(`CSRF Error: ${e.message}`, "error");
      throw e;
    }
  }
  async auth() {
    if (this.isAuth) return;
    try {
      this.log("Authenticating...");
      const csrfToken = await this.getCsrf();
      if (!csrfToken) throw new Error("No CSRF Token");
      const params = new URLSearchParams();
      params.append("csrfToken", csrfToken);
      params.append("callbackUrl", "https://www.vizify.ai/id/chat");
      await this.client.post("https://www.vizify.ai/api/auth/callback/anonymous", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const session = await this.client.get("https://www.vizify.ai/api/auth/session");
      if (session.data?.user) {
        this.isAuth = true;
        this.log("Auth Success");
      }
    } catch (e) {
      this.log(`Auth Failed: ${e.message}`, "error");
      throw e;
    }
  }
  parse(rawData) {
    const lines = rawData.split("\n");
    let textResult = "";
    let info = {};
    const toolsMap = {};
    for (const line of lines) {
      if (line.length < 3) continue;
      const splitIdx = line.indexOf(":");
      if (splitIdx === -1) continue;
      const prefix = line.substring(0, splitIdx);
      const contentStr = line.substring(splitIdx + 1);
      try {
        const content = JSON.parse(contentStr);
        switch (prefix) {
          case "0":
            textResult += content;
            break;
          case "9":
            if (content.toolCallId) {
              toolsMap[content.toolCallId] = {
                ...toolsMap[content.toolCallId],
                id: content.toolCallId,
                name: content.toolName,
                args: content.args,
                status: "running"
              };
            }
            break;
          case "a":
            if (content.toolCallId) {
              toolsMap[content.toolCallId] = {
                ...toolsMap[content.toolCallId],
                output: content.result,
                status: "completed"
              };
            }
            break;
          case "f":
            info.messageId = content.messageId;
            break;
          case "e":
          case "d":
            info = {
              ...info,
              ...content
            };
            if (content.usage) {
              info.usage = content.usage;
            }
            break;
          case "2":
            break;
        }
      } catch (e) {}
    }
    const tools = Object.values(toolsMap);
    return {
      result: textResult,
      tools: tools,
      info: info
    };
  }
  async chat({
    prompt,
    messages = [],
    model,
    ...rest
  }) {
    try {
      await this.auth();
      this.log("Sending Chat...");
      const msgs = messages.length ? messages : [{
        role: "user",
        content: prompt,
        parts: [{
          type: "text",
          text: prompt
        }]
      }];
      const res = await this.client.post("https://www.vizify.ai/api/chat", {
        id: uuidv4(),
        messages: msgs,
        model: model || "gpt-4o-mini",
        ...rest
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      this.log("Parsing Stream Response...");
      return this.parse(res.data);
    } catch (e) {
      this.log(`Chat Error: ${e.message}`, "error");
      if (e.response?.status === 401) this.isAuth = false;
      return {
        result: null,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Vizify();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}