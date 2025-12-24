import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const availableModels = [{
  value: "gpt-4o",
  name: "ChatGPT-4o",
  icon: "/images/models/chatgpt-icon.png"
}, {
  value: "gpt-4o-mini",
  name: "ChatGPT-4o Mini",
  icon: "/images/models/chatgpt-icon.png"
}, {
  value: "claude-3-opus",
  name: "Claude 3 Opus",
  icon: "/images/models/claude-ai-icon.png"
}, {
  value: "claude-3-sonnet",
  name: "Claude 3.5 Sonnet",
  icon: "/images/models/claude-ai-icon.png"
}, {
  value: "llama-3",
  name: "Llama 3",
  icon: "/images/models/meta-icon.png"
}, {
  value: "llama-3-pro",
  name: "Llama 3.1 (Pro)",
  icon: "/images/models/meta-icon.png"
}, {
  value: "perplexity-ai",
  name: "Perplexity AI",
  icon: "/images/models/perplexity-ai-icon.png"
}, {
  value: "mistral-large",
  name: "Mistral Large",
  icon: "/images/models/mistral-ai-icon.png"
}, {
  value: "gemini-1.5-pro",
  name: "Gemini 1.5 Pro",
  icon: "/images/models/google-gemini-icon.png"
}];
class WhatsTheBigDataChat {
  constructor() {
    this.baseURL = "https://whatsthebigdata.com/api/ask-ai/";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://whatsthebigdata.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://whatsthebigdata.com/ai-chat/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async chat({
    model = "gpt-4o",
    prompt = "Hello",
    history = []
  }) {
    try {
      const requestData = {
        message: prompt,
        model: model,
        history: history
      };
      const response = await axios.post(this.baseURL, requestData, {
        headers: this.headers
      });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      console.error("Error in chat request:", error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt diperlukan. Mohon berikan pesan untuk memulai percakapan.",
      availableModels: availableModels
    });
  }
  const validModelValues = availableModels.map(model => model.value);
  if (params.model && !validModelValues.includes(params.model)) {
    return res.status(400).json({
      error: `Model "${params.model}" tidak valid.`,
      availableModels: availableModels
    });
  }
  try {
    const chatClient = new WhatsTheBigDataChat();
    const response = await chatClient.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Terjadi kesalahan pada server internal."
    });
  }
}