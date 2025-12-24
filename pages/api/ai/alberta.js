import axios from "axios";
class SearchAI {
  constructor() {
    this.apiUrl = "https://searchai.alberta.ca/api/message/generate";
    this.headers = {
      "Content-Type": "application/json",
      "api-key": "e1cc7c5da4a5461295481d43251a9a28",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://searchai.alberta.ca/#"
    };
  }
  parseData = streamData => {
    let result = "",
      related = [];
    streamData.split("\n").forEach(v => {
      try {
        let {
          choices: [{
            messages: [{
              content
            }]
          }]
        } = JSON.parse(v);
        let match = content?.match(/"citations":\s*(\[[^\]]*\])/s);
        match ? related.push(...JSON.parse(match[1])) : result += content;
      } catch {}
    });
    return {
      result: result,
      related: related
    };
  };
  async sendMessage(inputData) {
    let messages = [];
    if (inputData?.messages) {
      messages = inputData.messages;
    } else if (inputData?.prompt) {
      messages = [{
        role: "assistant",
        content: "Hello! How can I assist you today?",
        id: "fd86e990-beeb-3d9d-82c9-180ed7d00de8"
      }, {
        role: "user",
        content: inputData.prompt,
        id: "68e23196-3900-c6bc-bd92-87ac3a7b8565"
      }];
    }
    const data = {
      messages: messages,
      conversation_id: inputData?.conversation_id || "21602668-a3c0-4c9b-84f2-c13bc717e31c"
    };
    try {
      const response = await axios.post(this.apiUrl, data, {
        headers: this.headers
      });
      const message = this.parseData(response.data);
      console.log("Full message:", message);
      return message;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const searchAI = new SearchAI();
  const inputData = req.method === "GET" ? req.query : req.body;
  try {
    const result = await searchAI.sendMessage(inputData);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Error processing message"
    });
  }
}