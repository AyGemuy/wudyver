import fetch from "node-fetch";
async function AiMath(prompt) {
  const url = "https://aimathgpt.forit.ai/api/ai";
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    Referer: "https://aimathgpt.forit.ai/#pricing",
    "Accept-Encoding": "gzip, deflate"
  };
  const data = {
    messages: [{
      role: "system",
      content: "You are an expert math tutor. For each question, provide: 1) A clear, step-by-step problem-solving approach. 2) A concise explanation of the underlying concepts. 3) One follow-up question to deepen understanding. 4) A helpful tip or common pitfall to watch out for. Keep your responses clear and concise."
    }, {
      role: "user",
      content: prompt
    }],
    model: "llama3"
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    });
    return (await response.json())?.result?.response;
  } catch (error) {
    console.error(error);
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await AiMath(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}