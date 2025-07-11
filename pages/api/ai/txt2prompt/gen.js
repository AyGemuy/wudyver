import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    message = "Hai",
      assistantMessage = "Hi there!"
  } = req.method === "GET" ? req.query : req.body;
  const payload = {
    message: [{
      role: "user",
      content: message
    }, {
      role: "assistant",
      content: assistantMessage
    }]
  };
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: "https://zaiwen.xueban.org.cn/chat"
  };
  try {
    const response = await fetch("https://common.zaiwen.top/generate_prompt", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const responseText = await response.text();
    return res.status(200).json(responseText);
  } catch (error) {
    res.status(500).send("Failed to fetch from Zaiwen API");
  }
}