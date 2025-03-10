import axios from "axios";
class ChatAPI {
  constructor() {
    this.baseURL = "https://animepersonalities.com/api/chatImage";
    this.bearerToken = "";
  }
  async fetchBearerToken() {
    try {
      const decKey = Buffer.from("QUl6YVN5RGhUVW1sSHM5Ui1qNjdueW9ETzVoSHhPemVTeFhzcWxV", "base64").toString("utf-8");
      const {
        data
      } = await axios.post("https://securetoken.googleapis.com/v1/token?key=" + decKey, new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: "AMf-vBywqNnJ7Z5iac90j0UMiuPPZz40jswf2EmAOph4lLWsKfhf6Uy0rCKaICUdA0bX4_38DgPe393grPuL6MFZ1P1sI93d4feda74QZTko0q6P18qHCfA8fsTYhqMWHyHt_7OGXXILKwhPXdLN4_wjrspcFs_X8W5CIu9aT8UPQLoR5Y2-3q95tU8sSkSPLk2eL3YDCMQJyWby-VbJNi5_PImdW2EpsRCeT-QgFGE57XHFJICXp_kumbtyVWFB0RGzbwEHpUJKlFaTM4y10SSpkultD5GjKVmxsVef9Zyt7HkhbhuMWQl6UWzqx9oDoP2UoGXj3aMvbq02OwFEqZTNrfjy-8HZueSY3rJR0jzupyCuuyqSH0JrAB9YHp3tSV8Gj6gRBznLmgbxWpi7vekM11sRZnrdvtyjJDC6181Hu5YQDOyBdB9xDr6kO5DDw4wSuRcyuEKh9A3HgEny8K-QMVXr1eF0KA"
      }), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      this.bearerToken = data.access_token;
      return this.bearerToken;
    } catch (error) {
      throw new Error("Error fetching bearer token");
    }
  }
  async getChatImage(systemMessage = "START", assistantMessage = "How can I assist?", userMessage = "Hello!", characterId = "f1503f3ee4b-41ae3eed-47fa-b2131-b895236655b0") {
    try {
      if (!this.bearerToken) await this.fetchBearerToken();
      const {
        data
      } = await axios.post(this.baseURL, JSON.stringify({
        messages: [{
          role: "system",
          content: systemMessage
        }, {
          role: "assistant",
          content: assistantMessage
        }, {
          role: "user",
          content: userMessage
        }],
        characterId: characterId
      }), {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://animepersonalities.com/chat/character/f1503f3ee4b-41ae3eed-47fa-b2131-b895236655b0"
        }
      });
      return data;
    } catch (error) {
      throw new Error("Error fetching chat image");
    }
  }
}
export default async function handler(req, res) {
  const {
    system: systemMessage,
    assistant: assistantMessage,
    prompt: userMessage,
    id: characterId
  } = req.method === "GET" ? req.query : req.body;
  if (!userMessage) {
    return res.status(400).json({
      error: "Prompt (userMessage) is required."
    });
  }
  try {
    const chatAPI = new ChatAPI();
    const result = await chatAPI.getChatImage(systemMessage, assistantMessage, userMessage, characterId);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}