import axios from "axios";
class Pizzagpt {
  constructor() {
    this.url = "https://www.pizzagpt.it";
    this.apiEndpoint = "/api/chatx-completion";
    this.working = true;
    this.defaultModel = "gpt-4o-mini";
  }
  async chat(model, prompt, proxy = null) {
    const headers = {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      origin: this.url,
      referer: `${this.url}/en`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      "x-secret": "Marinara"
    };
    try {
      const data = {
        question: prompt
      };
      const response = await axios.post(`${this.url}${this.apiEndpoint}`, data, {
        headers: headers,
        proxy: proxy
      });
      const content = response.data.answer?.content || response.data;
      return content || "No content available";
    } catch (error) {
      throw new Error(`Error generating response: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    model,
    prompt,
    proxy
  } = method === "POST" ? req.body : req.query;
  const pizzagpt = new Pizzagpt();
  try {
    const content = await pizzagpt.chat(model, prompt, proxy);
    return res.status(200).json({
      result: content
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}