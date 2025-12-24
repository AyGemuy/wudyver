import fetch from "node-fetch";
import ApiKey from "@/configs/api-key";
async function IslamAndAIChat(message) {
  try {
    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: ApiKey.openai?.[1],
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
      Referer: "https://islamandai.com/chat",
      Origin: "https://islamandai.com",
      "x-forwarded-for": new Array(4).fill(0).map(() => Math.floor(Math.random() * 256)).join(".")
    };
    const body = JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `The following is a conversation with an Islam-focused AI assistant. This assistant is strictly dedicated to matters concerning Islam, including Quranic verses, Hadiths, and events related to Islamic History. It should provide detailed and accurate responses, citing Quranic verses and Hadiths in Arabic, formatted in quotes and on separate lines for clarity.`
      }, {
        role: "user",
        content: message
      }],
      temperature: .3,
      max_tokens: 1024
    });
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    const data = await response.json();
    return data.choices[0]?.message.content || "No msg";
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
  const result = await IslamAndAIChat(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}