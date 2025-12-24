import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class Vo3aiChat {
  constructor() {
    this.apiUrl = "https://www.vo3ai.com/api/chat/completion";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://www.vo3ai.com",
      priority: "u=1, i",
      referer: "https://www.vo3ai.com/en/sign-in",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  getDynamicGreeting() {
    const greetings = ["Halo! Ada yang bisa saya bantu dengan video Anda hari ini?", "Selamat datang! Siap untuk membuat video yang luar biasa?", "Hai! Asisten VO3AI Anda di sini. Apa yang akan kita buat hari ini?"];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    try {
      let conversationHistory = [];
      if (messages && messages.length) {
        conversationHistory = [...messages];
      } else {
        conversationHistory.push({
          id: "greeting",
          content: this.getDynamicGreeting(),
          role: "assistant",
          timestamp: new Date().toISOString()
        });
      }
      const data = {
        message: prompt,
        conversationHistory: conversationHistory,
        ...rest
      };
      const response = await axios.post(this.apiUrl, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error during chat completion:", error.response ? error.response.data : error.message);
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
    const chatClient = new Vo3aiChat();
    const response = await chatClient.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}