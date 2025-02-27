import axios from "axios";
class GeminiUltraAPI {
  constructor() {
    this.url = "https://gemini-ultra-iota.vercel.app/api/chat?token=";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://gemini-ultra-iota.vercel.app/"
    };
  }
  async sendMessage(message, model, token) {
    try {
      const requestBody = {
        messages: [{
          role: "user",
          parts: [{
            text: message || "Hello"
          }]
        }],
        model: model || "gemini-1.5-flash-latest",
        generationConfig: {
          topP: .95,
          topK: 64,
          temperature: 1,
          maxOutputTokens: 8192
        },
        safety: "none"
      };
      const {
        data
      } = await axios.post(this.url + (token || ""), requestBody, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      return {
        error: error.message || "Something went wrong"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt: message,
    model,
    token
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  try {
    const gemini = new GeminiUltraAPI();
    const response = await gemini.sendMessage(message, model, token);
    res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}