import axios from "axios";
class AssistantClient {
  constructor() {
    this.client = axios.create({
      baseURL: "https://leaves.mintlify.com/api/assistant",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36"
      }
    });
    this.threadId = null;
    this.configs = {
      fal: {
        referer: "https://docs.fal.ai/",
        id: "fal-d8505a2e",
        path: "/fal-d8505a2e/message"
      },
      s2labs: {
        referer: "https://s2labs.mintlify.app/",
        id: "s2labs",
        path: "/s2labs/message"
      },
      musixmatch: {
        referer: "https://docs.musixmatch.com/lyrics-api/matcher/matcher-lyrics-get",
        id: "musixmatch",
        path: "/musixmatch/message"
      }
    };
  }
  async chat({
    mode = "s2labs",
    threadId,
    prompt,
    messages,
    ...rest
  }) {
    try {
      const config = this.configs[mode] || this.configs.fal;
      const useThreadId = threadId || this.threadId;
      const chatMessages = messages?.length ? messages : [{
        id: Date.now().toString(),
        role: "user",
        content: prompt,
        parts: [{
          type: "text",
          text: prompt
        }],
        createdAt: new Date().toISOString()
      }];
      const payload = {
        id: config.id,
        messages: chatMessages,
        fp: config.id,
        ...useThreadId && {
          threadId: useThreadId
        },
        ...rest
      };
      const response = await this.client.post(config.path, payload, {
        headers: {
          Referer: config.referer
        }
      });
      this.threadId = response.headers["x-thread-id"] || this.threadId;
      const result = this.parse(response?.data);
      return {
        status: true,
        mode: mode,
        result: result,
        threadId: this.threadId,
        ...rest
      };
    } catch (error) {
      const errorData = error?.response?.data;
      const invalidThread = typeof errorData === "string" && errorData.includes("Invalid Thread ID");
      if (invalidThread) {
        this.threadId = null;
        return this.chat({
          mode: mode,
          prompt: prompt,
          messages: messages,
          ...rest
        });
      }
      return {
        status: false,
        result: null,
        error: errorData || error?.message,
        threadId: this.threadId
      };
    }
  }
  parse(data) {
    if (!data || typeof data !== "string") return {
      text: ""
    };
    const result = {
      text: ""
    };
    for (const line of data.split("\n")) {
      if (!line.trim()) continue;
      const key = line[0];
      const payload = line.slice(2).trim();
      let obj;
      try {
        obj = JSON.parse(payload);
      } catch {
        if (key === "0" && payload.startsWith('"') && payload.endsWith('"')) {
          result.text += payload.slice(1, -1);
        }
        continue;
      }
      if (key === "0") {
        if (typeof obj === "string") {
          result.text += obj;
        } else if (obj && obj["0"]) {
          result.text += obj["0"];
        }
      } else if (obj && typeof obj === "object") {
        Object.assign(result, obj);
      }
    }
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AssistantClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan sistem."
    });
  }
}