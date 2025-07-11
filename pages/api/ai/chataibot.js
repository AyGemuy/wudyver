import fetch from "node-fetch";
class Chataibot {
  constructor() {}
  async chat({
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      const messagesToSend = messages.length ? messages : [{
        role: "user",
        content: prompt
      }];
      if (messages.length) {
        messagesToSend.push({
          role: "user",
          content: prompt
        });
      }
      const response = await fetch("https://chataibot.ru/api/promo-chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ru",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          Referer: "https://chataibot.ru/app/free-chat"
        },
        body: JSON.stringify({
          messages: messagesToSend,
          ...rest
        }),
        compress: true
      });
      const {
        answer: result
      } = await response.json();
      return {
        result: result
      };
    } catch (error) {
      console.error("Error sending chat message:", error);
      return null;
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
    const api = new Chataibot();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}