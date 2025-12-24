import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class SongGeneratorAI {
  constructor() {
    this.baseUrl = "https://songgeneratorai.org/api/chat-openai";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://songgeneratorai.org",
      priority: "u=1, i",
      referer: "https://songgeneratorai.org/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.cookies = "utm_tracking=%7B%22utm_source%22%3A%22iuu%22%2C%22referral_url%22%3A%22https%3A%2F%2Fiuu.ai%2F%22%2C%22date%22%3A%222025-08-03%2023%3A17%3A32%22%2C%22device_type%22%3A%22mobile%22%7D; _gcl_au=1.1.1262529247.1754263052";
  }
  async generateLyrics({
    prompt
  }) {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt must be a non-empty string.");
    }
    const data = {
      lyrics: prompt
    };
    try {
      const response = await axios.post(this.baseUrl, JSON.stringify(data), {
        headers: {
          ...this.headers,
          Cookie: this.cookies
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error generating lyrics:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const generator = new SongGeneratorAI();
    const generatedContent = await generator.generateLyrics(params);
    return res.status(200).json(generatedContent);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}