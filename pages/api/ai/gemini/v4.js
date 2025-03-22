import axios from "axios";
class GeminiAPI {
  constructor() {
    this.url = "https://bisal-ai-api.vercel.app/gemini";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://gemini-tau-cyan.vercel.app",
      priority: "u=1, i",
      referer: "https://gemini-tau-cyan.vercel.app/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async sendMessage({
    name = "User",
    prompt,
    model = "default",
    messages = []
  }) {
    try {
      const requestBody = {
        user: name,
        ai: messages.length ? messages : [{
          role: "user",
          parts: prompt
        }, {
          role: "model",
          parts: `Hello ${name}, I am Gemini using ${model} model.`
        }]
      };
      const {
        data
      } = await axios.post(this.url, requestBody, {
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
    const gemini = new GeminiAPI();
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