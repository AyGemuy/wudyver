import axios from "axios";
import {
  randomUUID
} from "crypto";
import fakeUa from "fake-useragent";
class CalopalChat {
  constructor() {
    this.baseUrl = "https://api.calopal.ai/h5/chat/completions";
    this.headers = {
      accept: "text/event-stream",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://calcounter.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://calcounter.com/",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": fakeUa(),
      "x-visitor-id": randomUUID()
    };
  }
  async chat(content, assistant) {
    const payload = {
      messages: [{
        role: "assistant",
        content: [{
          type: "text",
          text: assistant || "Tell me the name of your food, or send me a picture of the food, and I will tell you the calorie count of that food."
        }]
      }, {
        role: "user",
        content: content
      }],
      chatId: 1601
    };
    try {
      const {
        data
      } = await axios.post(this.baseUrl, payload, {
        headers: this.headers
      });
      const result = data.split("\n").filter(line => line.startsWith("data:")).map(line => {
        try {
          return JSON.parse(line.slice(6))?.choices[0]?.delta?.content || null;
        } catch (error) {
          return null;
        }
      }).filter(Boolean).join("");
      return result || null;
    } catch (error) {
      console.error("Error sending message:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const method = req.method;
  const {
    prompt: text,
    assistant
  } = method === "POST" ? req.body : req.query;
  if (!text) {
    return res.status(400).json({
      message: "Prompt is required."
    });
  }
  const calopal = new CalopalChat();
  try {
    const result = await calopal.chat(text);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}