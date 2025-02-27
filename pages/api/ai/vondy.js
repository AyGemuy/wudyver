import axios from "axios";
class VondyChat {
  constructor() {
    this.apiUrl = "https://vondyapi-proxy.com/bot/8e5fddc2-d5bb-42be-9f63-3142d73ccfd6/chat-stream-assistant-dfp/";
    this.headers = {
      accept: "text/event-stream",
      "content-type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.vondy.com/assistant?chat=SGFp&lc=5"
    };
  }
  async sendRequest(payload) {
    try {
      const response = await axios.post(this.apiUrl, payload, {
        headers: this.headers
      });
      return this.parseResponse(response.data);
    } catch (error) {
      console.error("Error processing request:", error);
      throw new Error(error.response?.data || error.message || "Request failed");
    }
  }
  createPayload(inputData) {
    try {
      const prompt = inputData.prompt ?? "Hello";
      const messages = prompt ? [{
        role: "user",
        content: [{
          type: "text",
          text: prompt
        }]
      }] : inputData.messages;
      return {
        messages: messages || [],
        context: {
          url: inputData?.url ?? "https://www.vondy.com/assistant?chat=SGFp"
        },
        mod: inputData?.mod ?? true,
        useCredit: inputData?.useCredit ?? true,
        fp: inputData?.fp ?? null,
        isVision: inputData?.isVision ?? 0,
        claude: inputData?.claude ?? false,
        mini: inputData?.mini ?? true
      };
    } catch (error) {
      console.error("Error creating payload:", error);
      throw new Error("Failed to create payload");
    }
  }
  parseResponse(responseData) {
    try {
      const dataChunks = responseData.split("\n").filter(line => line.startsWith("data:"));
      const combinedData = dataChunks.map(line => line.slice(6)).join("");
      return {
        result: combinedData
      };
    } catch (error) {
      console.error("Error parsing response data:", error);
      throw new Error("Failed to parse response");
    }
  }
}
export default async function handler(req, res) {
  const inputData = req.method === "POST" ? req.body : req.query;
  const vondyChat = new VondyChat();
  try {
    const payload = vondyChat.createPayload(inputData);
    const data = await vondyChat.sendRequest(payload);
    return res.status(200).json({
      success: true,
      result: data.result
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: "Failed to process the request",
      details: error.message
    });
  }
}