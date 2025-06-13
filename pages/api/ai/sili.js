import axios from "axios";
const decodeKey = encodedKey => Buffer.from(encodedKey, "base64").toString("utf-8");
class SiliconFlowAPI {
  constructor() {
    this.apiUrl = "https://api.siliconflow.cn/v1/chat/completions";
    this.apiKey = decodeKey("c2stY3dheXdxbHlndG5hZm5oc2dmbmRpY3NxcnlhcmJjb2pzdmdmampzc3F0bWpzZHdl");
    this.defaultModel = "internlm/internlm2_5-7b-chat";
  }
  async chat({
    prompt,
    model = this.defaultModel,
    system,
    messages = [],
    ...rest
  }) {
    if (!prompt && messages.length === 0) {
      throw new Error("Either 'prompt' or 'messages' must be provided for the chat.");
    }
    const chatMessages = messages.length > 0 ? messages : [{
      role: "user",
      content: prompt
    }, ...system ? [{
      role: "system",
      content: system
    }] : []];
    const requestData = {
      model: model,
      messages: chatMessages,
      ...rest
    };
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Origin: "https://api.siliconflow.cn",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    };
    try {
      const response = await axios.post(this.apiUrl, requestData, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error("Error calling SiliconFlow API:", errorMessage);
      throw new Error(`Failed to get chat completion: ${errorMessage}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new SiliconFlowAPI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}