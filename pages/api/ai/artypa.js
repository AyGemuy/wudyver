import axios from "axios";
class ArtypaAI {
  constructor() {
    this.endpoint = "https://artypa.com/api/chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://artypa.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://artypa.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  generateId() {
    return Math.random().toString(36).slice(2, 18);
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  getISOTime() {
    return new Date().toISOString();
  }
  async chat({
    prompt,
    messages,
    model = "chat-model-small"
  }) {
    messages = prompt ? [{
      id: this.generateId(),
      createdAt: this.getISOTime(),
      role: "user",
      content: prompt
    }] : messages && messages.length ? messages : [];
    const payload = {
      id: this.generateUUID(),
      messages: messages,
      selectedChatModel: model
    };
    try {
      const res = await axios.post(this.endpoint, payload, {
        headers: this.headers
      });
      let resultText = "";
      let messageId = null;
      if (typeof res.data === "string") {
        const lines = res.data.split("\n").map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith("f:")) {
            messageId = JSON.parse(line.slice(2)).messageId;
          } else if (line[0] === "0" && line[1] === ":") {
            resultText += JSON.parse(line.slice(2));
          }
        }
      }
      return {
        result: resultText.trim(),
        messageId: messageId
      };
    } catch (err) {
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const ai = new ArtypaAI();
  try {
    const data = await ai.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}