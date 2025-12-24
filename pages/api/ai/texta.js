import axios from "axios";
class FreeToolGenerator {
  constructor() {
    this.url = "https://generatefreetool-4mxg7rj7ya-uc.a.run.app/";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://texta.ai",
      priority: "u=1, i",
      referer: "https://texta.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    prompt,
    messages
  }) {
    try {
      const data = {
        input: prompt ? [{
          role: "user",
          text: prompt
        }] : messages,
        page: "free-ai-image-generator",
        toolname: "free ai image generator",
        token: `token_${Math.random().toString(36).substr(2, 9)}`
      };
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const texta = new FreeToolGenerator();
  try {
    const data = await texta.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}