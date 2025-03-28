import axios from "axios";
import {
  FormData
} from "formdata-node";
class GeminiAPI {
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
  async chat({
    model = "gemini-1.5-flash",
    prompt,
    messages = []
  }) {
    try {
      const form = new FormData();
      form.append("model", model);
      form.append("messages", JSON.stringify(messages.length ? messages : [{
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
      throw new Error("Error during chat request");
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
  const gemini = new GeminiAPI();
  try {
    const data = await gemini.chat(params);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}