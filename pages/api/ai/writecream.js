import axios from "axios";
class ChatAPI {
  constructor() {
    this.baseURL = "https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat";
  }
  async sendMessage(query) {
    try {
      const response = await axios.get(this.baseURL, {
        params: {
          query: JSON.stringify(query),
          link: "writecream.com"
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
          Referer: "https://www.writecream.com/chatgpt-chat/"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt = "Hai",
      system = "You are a helpful and informative AI assistant.",
      messages
  } = req.method === "GET" ? req.query : req.body;
  const finalQuery = messages ? JSON.parse(messages) : [{
    role: "system",
    content: system
  }, {
    role: "user",
    content: prompt
  }];
  const chatAPI = new ChatAPI();
  try {
    const result = await chatAPI.sendMessage(finalQuery);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to get response from the chat API."
    });
  }
}