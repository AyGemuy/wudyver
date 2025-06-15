import axios from "axios";
class CriblAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = "https://ai.cribl.cloud/api/chat";
  }
  async sendMessage(messages) {
    try {
      const response = await axios.post(this.baseURL, {
        messages: messages
      }, {
        headers: {
          "Content-Type": "application/json",
          "x-cribl-surface": "copilot-docs",
          "x-cribl-docs-uid": this.apiKey,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://docs.cribl.io/suite/copilot-chat/"
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
    prompt = "halo",
      messages,
      apiKey = "c4e80f46-c905-40c2-8ae7-eea9816f9bd0",
      type = "generic_logged_out"
  } = req.method === "GET" ? req.query : req.body;
  const client = new CriblAIClient(apiKey);
  try {
    const messagePayload = messages ? JSON.parse(messages) : [{
      role: "user",
      content: prompt,
      type: type
    }];
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