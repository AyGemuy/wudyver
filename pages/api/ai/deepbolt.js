import axios from "axios";
class DeepboltAI {
  constructor() {
    this.baseUrl = "https://deepbolt.xyz";
    this.headersChat = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      cookie: "_ga=GA1.1.1134225214.1744725660; _ga_86BWKFB8T0=GS1.1.1744725659.1.0.1744725659.0.0.0",
      origin: this.baseUrl,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.headersGenerate = {
      ...this.headersChat,
      "content-type": "text/plain;charset=UTF-8"
    };
  }
  async chat({
    prompt,
    model = "deepseek-ai/DeepSeek-V3",
    quality = "low"
  }) {
    try {
      console.log("[Deepbolt] Sending chat request...");
      const chatRes = await axios.post(`${this.baseUrl}/api/chat`, {
        prompt: prompt,
        model: model,
        quality: quality
      }, {
        headers: this.headersChat
      });
      const messageId = chatRes.data?.lastMessageId;
      console.log("[Deepbolt] Received messageId:", messageId);
      if (!messageId) throw new Error("Gagal mendapatkan message ID");
      console.log("[Deepbolt] Generating response...");
      const genRes = await axios.post(`${this.baseUrl}/api/generate`, JSON.stringify({
        messageId: messageId,
        model: model
      }), {
        headers: this.headersGenerate,
        responseType: "text"
      });
      const lines = genRes.data.trim().split("\n");
      const result = lines.map(line => {
        try {
          const json = JSON.parse(line);
          return json?.choices?.[0]?.delta?.content || "";
        } catch (e) {
          console.warn("[Deepbolt] Gagal parse line:", line);
          return "";
        }
      }).join("");
      console.log("[Deepbolt] Final result:", result);
      return {
        id: messageId,
        result: result
      };
    } catch (error) {
      console.error("[Deepbolt] Error during chat:", error.message || error);
      throw error;
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
    const bot = new DeepboltAI();
    const response = await bot.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}