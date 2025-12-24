import axios from "axios";
class ChatService {
  constructor(baseURL = "https://tecuts-chat.hf.space") {
    this.getRandomIp = () => {
      return Array.from({
        length: 4
      }, () => Math.floor(Math.random() * 256)).join(".");
    };
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
        origin: "https://chrunos.com",
        referer: "https://chrunos.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "X-Forwarded-For": this.getRandomIp()
      }
    });
  }
  parseStreamData(streamData) {
    const result = {};
    streamData.split("\n").forEach(line => {
      if (!line.startsWith("data: ")) return;
      try {
        const {
          type,
          data: payload
        } = JSON.parse(line.slice(6));
        if (!result[type]) {
          result[type] = Array.isArray(payload) ? [] : typeof payload === "string" ? "" : {};
        }
        if (Array.isArray(payload)) {
          result[type].push(...payload);
        } else if (typeof payload === "string") {
          result[type] += payload;
        } else {
          Object.assign(result[type], payload);
        }
      } catch (e) {
        console.error("Failed to parse JSON:", line, e);
      }
    });
    if (result.content && typeof result.content === "string") {
      result.content = result.content.trim();
    }
    return result;
  }
  async chat({
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      const payload = {
        message: prompt,
        system_prompt: "You are a helpful assistant.",
        use_search: true,
        temperature: .85,
        history: messages.length ? messages : [{
          role: "user",
          content: prompt
        }],
        ...rest
      };
      const response = await this.api.post("/chat/stream", payload);
      return this.parseStreamData(response.data);
    } catch (error) {
      console.error("Internal Server Error:", error);
      throw error;
    }
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
    const chatService = new ChatService();
    const response = await chatService.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}