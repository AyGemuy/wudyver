import axios from "axios";
class LlamaCoder {
  constructor() {
    this.baseUrl = "https://llamacoder.together.ai/";
    this.headers = {
      accept: "text/x-component",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": "78feb8d885f31503bb4032395dfc2f3df9d3135e11",
      "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(main)%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2F%22%2C%22refresh%22%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
      origin: "https://llamacoder.together.ai",
      priority: "u=1, i",
      referer: "https://llamacoder.together.ai/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.models = ["Qwen/Qwen2.5-Coder-32B-Instruct", "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", "meta-llama/Llama-3.3-70B-Instruct-Turbo", "deepseek-ai/DeepSeek-V3"];
  }
  async chat({
    prompt,
    model = 1
  }) {
    if (model < 1 || model > this.models.length) {
      console.log("Invalid model. Available models:", this.models.map((m, i) => `${i + 1}: ${m}`));
      return {
        error: "Invalid model",
        models: this.models
      };
    }
    const selectedModel = this.models[model - 1];
    try {
      const {
        data
      } = await axios.post(this.baseUrl, [prompt, selectedModel, "high", "$undefined"], {
        headers: this.headers
      });
      const {
        chatId,
        messageId
      } = this.parseResponse(data);
      if (!chatId || !messageId) return {
        chatId: chatId,
        messageId: messageId,
        fullCompletion: ""
      };
      const {
        data: completionData
      } = await axios.post(`${this.baseUrl}api/get-next-completion-stream-promise`, JSON.stringify({
        messageId: messageId,
        model: selectedModel
      }), {
        headers: this.headers
      });
      return {
        chatId: chatId,
        messageId: messageId,
        fullCompletion: this.parseCompletion(completionData)
      };
    } catch (error) {
      console.log("Error:", error.message);
      return {
        error: error.message
      };
    }
  }
  parseResponse(data) {
    return data.split("\n").reduce((acc, line) => {
      try {
        const json = JSON.parse(line.slice(line.indexOf("{")));
        if (json.chatId) acc.chatId = json.chatId;
        if (json.lastMessageId) acc.messageId = json.lastMessageId;
      } catch {}
      return acc;
    }, {});
  }
  parseCompletion(data) {
    return data.split("\n").map(line => {
      try {
        return JSON.parse(line.slice(line.indexOf("{"))).choices?.[0]?.delta?.content || "";
      } catch {
        return "";
      }
    }).join("");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const llama = new LlamaCoder();
  try {
    const data = await llama.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}