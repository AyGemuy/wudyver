import axios from "axios";
class GeminiChat {
  constructor() {
    this.apiKey = "dhh474hdikok865643490";
    this.baseUrl = "https://geminiai-sz51.onrender.com/gemini/api/chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://geminichatai.netlify.app",
      priority: "u=1, i",
      referer: "https://geminichatai.netlify.app/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-api-key": this.apiKey
    };
  }
  async chat({
    prompt: userInput,
    previousChat = [],
    chatHistoryId = ""
  }) {
    try {
      const response = await axios.post(this.baseUrl, {
        userInput: userInput,
        previousChat: previousChat,
        chatHistoryId: chatHistoryId
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(`Chat request failed: ${error.message}`);
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
    const gemini = new GeminiChat();
    const response = await gemini.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}