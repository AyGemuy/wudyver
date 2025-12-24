import axios from "axios";
class FeToolClient {
  constructor(apiKey, model, temperature) {
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
    this.baseURL = "https://api.fe-tool.com/chat/completions";
  }
  async sendMessage(messages) {
    try {
      const response = await axios.post(this.baseURL, {
        model: this.model,
        temperature: this.temperature,
        messages: messages
      }, {
        headers: {
          accept: "application/json",
          "accept-language": "id-ID,id;q=0.9",
          authorization: `Bearer ${this.apiKey}`,
          "cache-control": "no-cache",
          "content-type": "application/json",
          pragma: "no-cache",
          "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "x-fe-csrf": "1737198281200|7787|6649809508337",
          "x-stainless-arch": "unknown",
          "x-stainless-lang": "js",
          "x-stainless-os": "Unknown",
          "x-stainless-package-version": "4.56.0",
          "x-stainless-runtime": "browser:chrome",
          "x-stainless-runtime-version": "131.0.0"
        }
      });
      return response.data;
    } catch {
      throw new Error("Failed to send message");
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt = "Halo",
      messages,
      model = "gpt-4o-mini",
      temperature = 0,
      apiKey = "FAKE_KEY",
      system,
      assistant
  } = req.method === "GET" ? req.query : req.body;
  const client = new FeToolClient(apiKey, model, parseFloat(temperature));
  try {
    const messagePayload = messages ? JSON.parse(messages) : [...system ? [{
      role: "system",
      content: system
    }] : [], {
      role: "user",
      content: prompt
    }, ...assistant ? [{
      role: "assistant",
      content: assistant
    }] : []];
    const response = await client.sendMessage(messagePayload);
    return res.status(200).json({
      success: true,
      data: response
    });
  } catch {
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan"
    });
  }
}