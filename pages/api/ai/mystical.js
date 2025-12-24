import axios from "axios";
class MhysticalAPI {
  constructor() {
    this.url = "https://api.mhystical.cc";
    this.apiEndpoint = "/v1/completions";
    this.defaultModel = "gpt-4";
  }
  async chat(prompt, model = this.defaultModel) {
    const headers = {
      "x-api-key": "mhystical",
      "Content-Type": "application/json",
      accept: "*/*",
      "cache-control": "no-cache",
      origin: this.url,
      referer: `${this.url}/`,
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    };
    const data = {
      model: model,
      messages: [{
        role: "user",
        content: prompt
      }]
    };
    try {
      const response = await axios.post(this.url + this.apiEndpoint, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Error creating completion:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    model
  } = req.method === "POST" ? req.body : req.query;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const mhysticalAPI = new MhysticalAPI();
  try {
    const result = await mhysticalAPI.chat(prompt, model);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate response"
    });
  }
}