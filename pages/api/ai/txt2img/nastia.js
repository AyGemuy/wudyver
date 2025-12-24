import axios from "axios";
class NastiaAI {
  constructor() {
    this.baseURL = "https://www.nastia.ai/api/v2/tools";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.nastia.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.nastia.ai/tools/uncensored-ai-image-generator",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateImage(prompt) {
    try {
      const response = await axios.post(`${this.baseURL}/get-image`, {
        prompt: prompt
      }, {
        headers: this.headers,
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt parameter is required"
    });
  }
  try {
    const nastiaAI = new NastiaAI();
    const imageData = await nastiaAI.generateImage(prompt);
    res.setHeader("Content-Type", "image/png");
    res.send(imageData);
  } catch (error) {
    console.error("Failed to generate image:", error);
    return res.status(500).json({
      error: "Failed to fetch the image"
    });
  }
}