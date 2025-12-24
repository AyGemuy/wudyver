import axios from "axios";
import crypto from "crypto";
class ChutesAI {
  constructor() {
    this.url = "https://chat.chutes.ai/api/chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://chat.chutes.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://chat.chutes.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  generateId(prefix = "") {
    return `${prefix ? prefix + "-" : ""}${crypto.randomUUID()}`;
  }
  async getBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const mimeType = response.headers["content-type"] || "image/jpeg";
      const base64Image = Buffer.from(response.data, "binary").toString("base64");
      return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
      throw error;
    }
  }
  async chat({
    prompt = "",
    messages = [],
    imageUrl,
    model = "chutesai/Llama-4-Maverick-17B-128E-Instruct-FP8"
  }) {
    try {
      const chatId = this.generateId();
      const now = new Date().toISOString();
      const systemId = this.generateId("system");
      const userId = this.generateId();
      const finalMessages = messages.length ? messages : [{
        role: "user",
        content: prompt || "",
        id: userId,
        chatId: chatId,
        createdOn: now,
        model: null
      }];
      if (!messages.length) {
        finalMessages.unshift({
          role: "system",
          content: "",
          id: systemId,
          chatId: chatId,
          createdOn: now,
          model: null
        });
      }
      const userMessageContent = {
        type: "text",
        text: prompt || finalMessages[0].content
      };
      if (imageUrl) {
        const base64Image = await this.getBase64(imageUrl);
        const imageMsgId = this.generateId();
        finalMessages.push({
          role: "user",
          content: [userMessageContent, {
            type: "image_url",
            image_url: {
              url: base64Image
            }
          }],
          id: imageMsgId,
          chatId: chatId,
          createdOn: now,
          model: null
        });
      } else {
        finalMessages.push({
          role: "user",
          content: [userMessageContent],
          id: this.generateId(),
          chatId: chatId,
          createdOn: now,
          model: null
        });
      }
      const payload = {
        messages: finalMessages,
        model: model
      };
      const res = await axios.post(this.url, payload, {
        headers: this.headers
      });
      const result = res.data.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5)).filter(data => data && data !== "[DONE]").map(data => {
        try {
          return JSON.parse(data).choices?.[0]?.delta?.content || "";
        } catch {
          return "";
        }
      }).join("");
      return {
        result: result
      };
    } catch (error) {
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
    const ai = new ChutesAI();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}