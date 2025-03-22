import axios from "axios";
class GeminiUltraAPI {
  constructor() {
    this.url = "https://gemini-ultra-iota.vercel.app/api/chat?token=";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://gemini-ultra-iota.vercel.app/"
    };
  }
  async sendMessage({
    prompt,
    model = "gemini-1.5-flash-latest",
    messages = [],
    top_p = .95,
    top_k = 64,
    temp = 1,
    max = 8192,
    safe = "none",
    token = ""
  }) {
    try {
      const requestBody = {
        messages: messages.length ? messages : [{
          role: "user",
          parts: [{
            text: prompt
          }]
        }],
        model: model,
        generationConfig: {
          topP: top_p,
          topK: top_k,
          temperature: temp,
          maxOutputTokens: max
        },
        safety: safe
      };
      const {
        data
      } = await axios.post(this.url + token, requestBody, {
        headers: this.headers
      });
      return data;
    } catch (error) {
      throw new Error(error.message || "Something went wrong");
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
    const gemini = new GeminiUltraAPI();
    const response = await gemini.sendMessage(params);
    res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}