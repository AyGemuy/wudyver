import axios from "axios";
class GPT24Handler {
  constructor() {
    this.baseUrl = "https://gpt24-ecru.vercel.app/api/openai/v1/chat/completions";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "accept-language": "id-ID",
      referer: "https://gpt24-ecru.vercel.app/",
      origin: "https://gpt24-ecru.vercel.app",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=0",
      te: "trailers",
      Cookie: "_ga_89WN60ZK2E=GS1.1.1736208261.1.1.1736208312.0.0.0; _ga=GA1.1.1312319525.1736208262"
    };
  }
  async chat(prompt, question, model = "gpt-4o-mini") {
    try {
      const data = {
        messages: [{
          role: "system",
          content: prompt
        }, {
          role: "user",
          content: question
        }],
        stream: false,
        model: model,
        temperature: .5,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: 1,
        max_tokens: 4e3
      };
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || error.message);
    }
  }
  async chatWithImage(prompt, question, imageUrl, model = "gpt-4o-mini") {
    try {
      const data = {
        messages: [{
          role: "system",
          content: prompt
        }, {
          role: "user",
          content: [{
            type: "text",
            text: question
          }, {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }]
        }],
        stream: false,
        model: model,
        temperature: .5,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: 1,
        max_tokens: 4e3
      };
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data || error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt,
    question,
    imageUrl,
    model
  } = req.query;
  if (!action || !prompt || !question) {
    return res.status(400).json({
      error: "Missing required parameters: action, prompt, or question"
    });
  }
  const gptHandler = new GPT24Handler();
  try {
    let result;
    if (action === "chat") {
      result = await gptHandler.chat(prompt, question, model);
    } else if (action === "image") {
      if (!imageUrl) {
        return res.status(400).json({
          error: "Missing required parameter: imageUrl for action=image"
        });
      }
      result = await gptHandler.chatWithImage(prompt, question, imageUrl, model);
    } else {
      return res.status(400).json({
        error: 'Invalid action. Use "chat" or "image"'
      });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}