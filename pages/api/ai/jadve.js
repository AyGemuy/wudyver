import fetch from "node-fetch";
const extractData = input => {
  return input.split("\n").filter(line => line.startsWith("0")).map(line => {
    try {
      const json = JSON.parse(line.slice(2).trim());
      return json || "";
    } catch {
      return "";
    }
  }).join("").trim();
};
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    prompt: message,
    model,
    botId,
    chatId,
    temperature
  } = req.method === "POST" ? req.body : req.query;
  return await processRequest(message, model, botId, chatId, temperature, res);
}
async function processRequest(message, model, botId, chatId, temperature, res) {
  if (!message) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const headers = {
    "Content-Type": "application/json",
    "x-authorization": "Bearer ",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: "https://jadve.com/id"
  };
  const payload = {
    messages: [{
      role: "user",
      content: [{
        type: "text",
        text: message
      }]
    }],
    model: model || "gpt-4o-mini",
    botId: botId || "",
    chatId: chatId || "",
    stream: true,
    temperature: temperature || .7,
    returnTokensUsage: true
  };
  try {
    const response = await fetch("https://openai.jadve.com/stream", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch data"
      });
    }
    const data = await response.text();
    return res.status(200).json({
      result: extractData(data)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}