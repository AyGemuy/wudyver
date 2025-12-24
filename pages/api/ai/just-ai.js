import fetch from "node-fetch";
async function justAI(content) {
  try {
    const url = "https://gpt-playground.just-ai.com/api/completion";
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer null",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
      Referer: "https://gpt-playground.just-ai.com/chat/406f48b9-a2c6-4dc6-b838-6a48f222df9a"
    };
    const body = JSON.stringify({
      model: "gpt-3.5-turbo",
      temperature: .5,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: .6,
      messages: [{
        role: "system",
        content: "You are a helpful AI chatbot."
      }, {
        role: "user",
        content: content
      }]
    });
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    const result = await response.text();
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
  const result = await justAI(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}