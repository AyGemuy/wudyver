import axios from "axios";
const parseResponse = response => {
  const lines = response.split("\n");
  const dataLines = lines.filter(line => line.startsWith("data:"));
  if (dataLines.length > 0) {
    let content = "";
    dataLines.forEach(line => {
      const jsonString = line.slice(5).trim();
      try {
        const parsedData = JSON.parse(jsonString);
        parsedData.choices.forEach(choice => {
          if (choice.delta && choice.delta.content) {
            content += choice.delta.content;
          }
        });
      } catch (error) {
        return null;
      }
    });
    return content;
  }
  return null;
};
class HeuristAi {
  constructor() {
    this.baseUrl = "https://pondera.heurist.ai/api/chat";
    this.modelUrl = "https://raw.githubusercontent.com/heurist-network/heurist-models/main/models.json";
    this.headers = {
      accept: "text/event-stream",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://pondera.heurist.ai",
      referer: "https://pondera.heurist.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat(message, modelId = "mistralai/mixtral-8x7b-instruct") {
    const data = {
      messages: [{
        role: "user",
        content: message
      }],
      modelId: modelId,
      stream: true
    };
    try {
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error in chat request:", error);
      throw error;
    }
  }
  async getModels() {
    try {
      const response = await axios.get(this.modelUrl, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const heuristAI = new HeuristAi();
  const {
    action
  } = req.query;
  if (action === "chat") {
    const message = req.method === "GET" ? req.query.message : req.body.message;
    const modelId = req.method === "GET" ? req.query.modelId : req.body.modelId;
    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }
    try {
      const chatResponse = await heuristAI.chat(message, modelId);
      return res.status(200).json({
        result: parseResponse(chatResponse)
      });
    } catch (error) {
      return res.status(500).json({
        error: "Error in chat request"
      });
    }
  } else if (action === "model") {
    try {
      const models = await heuristAI.getModels();
      return res.status(200).json({
        result: models
      });
    } catch (error) {
      return res.status(500).json({
        error: "Error fetching models"
      });
    }
  } else {
    return res.status(400).json({
      error: "Invalid action"
    });
  }
}