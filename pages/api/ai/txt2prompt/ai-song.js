import axios from "axios";
class AIChatService {
  constructor() {
    this.baseURL = "https://ai-song.ai/api/chat-openai";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://ai-song.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://ai-song.ai/?via=aitoolhunt&utm_source=aitoolhunt&ref=aitoolhunt&fpr=aitoolhunt",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async getChatResponse({
    prompt: lyrics
  }) {
    try {
      const data = {
        lyrics: lyrics
      };
      const response = await axios.post(this.baseURL, JSON.stringify(data), {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching chat response:", error);
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
    const chatService = new AIChatService();
    const response = await chatService.getChatResponse(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}