import axios from "axios";
import {
  FormData
} from "formdata-node";
class GeminiAuth {
  constructor() {
    this.url = "https://ai.jaze.top/api/auth/gemini";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "multipart/form-data",
      cookie: "i18n_redirected=zh",
      origin: "https://ai.jaze.top",
      priority: "u=1, i",
      referer: "https://ai.jaze.top/?session=1",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async requestAuth(prompt) {
    try {
      const form = new FormData();
      form.append("model", "gemini-1.5-flash");
      form.append("messages", JSON.stringify([{
        role: "system",
        content: "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown."
      }, {
        role: "user",
        content: prompt
      }]));
      const response = await axios.post(this.url, form, {
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
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  const gemini = new GeminiAuth();
  try {
    const result = await gemini.requestAuth(prompt);
    return res.status(200).json({
      result: typeof result === "object" ? result : result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}