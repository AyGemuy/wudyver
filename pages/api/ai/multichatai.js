import axios from "axios";
class MultiChatAI {
  constructor() {
    this.url = "https://www.multichatai.com/api/chat/deepinfra";
    this.headers = {
      "Content-Type": "application/json",
      "accept-language": "en-US,en;q=0.9,en-GB;q=0.8,en-IN;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": `"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"`,
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": `"Windows"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      referrer: "https://www.multichatai.com/1ed886c3-9f08-4090-9e44-123456/chat?model=claude-3-5-sonnet",
      referrerPolicy: "strict-origin-when-cross-origin"
    };
  }
  async chat({
    prompt,
    messages = [{
      role: "user",
      content: prompt
    }],
    model = "deepseek-ai/DeepSeek-R1",
    temp = .5,
    max = 32e3,
    profile = true,
    instruct = true,
    provider = "openai",
    custom = ""
  }) {
    try {
      const data = {
        chatSettings: {
          model: model,
          prompt: prompt,
          temperature: temp,
          contextLength: max,
          includeProfileContext: profile,
          includeWorkspaceInstructions: instruct,
          embeddingsProvider: provider
        },
        messages: messages,
        customModelId: custom
      };
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      return this.parseResponse(response.data);
    } catch (error) {
      console.error("Error fetching chat response:", error.message);
      return null;
    }
  }
  parseResponse(text) {
    let think = null;
    let result = text;
    const start = text.indexOf("<think>");
    const end = text.indexOf("</think>");
    if (start !== -1 && end !== -1) {
      think = text.substring(start + 7, end).trim();
      result = text.substring(end + 8).trim();
    }
    return think ? {
      think: think,
      result: result
    } : {
      result: result
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const chatAI = new MultiChatAI();
  try {
    const data = await chatAI.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}