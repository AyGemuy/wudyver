import fetch from "node-fetch";
async function Chataibot(content) {
  try {
    const response = await fetch("https://chataibot.ru/api/promo-chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "ru",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://chataibot.ru/app/free-chat"
      },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: content
        }]
      }),
      compress: true
    });
    const {
      answer: result
    } = await response.json();
    return result;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await Chataibot(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}