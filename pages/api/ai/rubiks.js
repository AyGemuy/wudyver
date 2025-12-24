import axios from "axios";
class RubiksAPI {
  constructor() {
    this.url = "https://rubiks.ai/search/api/";
    this.defaultModel = "gpt-4o-mini";
  }
  async chat(prompt, model = this.defaultModel, stream = true) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://rubiks.ai",
      referer: `https://rubiks.ai/search/?q=${encodeURIComponent(prompt)}&model=${model}`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    const data = {
      model: model,
      stream: stream,
      messages: [{
        role: "user",
        content: prompt
      }],
      temperature: .6,
      search: ""
    };
    try {
      const response = await axios.post(this.url, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Error during API call:", error.message);
      throw new Error("Failed to fetch from Rubiks API");
    }
  }
}
const parseStreamData = data => {
  const lines = data.split("\n");
  return lines.filter(line => line.startsWith("data:")).map(line => {
    try {
      const parsedData = JSON.parse(line.slice(5));
      return parsedData?.choices?.[0]?.delta?.content || "";
    } catch (e) {
      return "";
    }
  }).join("");
};
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
  const rubiksAPI = new RubiksAPI();
  try {
    const result = await rubiksAPI.chat(prompt, model);
    const parsedData = parseStreamData(result);
    return res.status(200).json({
      result: parsedData
    });
  } catch (error) {
    console.error("Error in handler:", error.message);
    res.status(500).json({
      error: "Failed to generate response"
    });
  }
}