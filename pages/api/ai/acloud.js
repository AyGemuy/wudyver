import fetch from "node-fetch";
async function AcloudAi(inputText) {
  const options = {
    messages: [{
      role: "user",
      content: inputText
    }]
  };
  try {
    const payload = {
      model: "gemini-pro",
      messages: options?.messages,
      temperature: options?.temperature || .9,
      top_p: options?.top_p || .7,
      top_k: options?.top_k || 40
    };
    if (!payload.messages) throw new Error("Missing messages input payload!");
    if (!Array.isArray(payload.messages)) throw new Error("invalid array in messages input payload!");
    if (isNaN(payload.top_p)) throw new Error("Invalid number in top_p payload!");
    if (isNaN(payload.top_k)) throw new Error("Invalid number in top_k payload!");
    const response = await fetch("https://api.acloudapp.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "sk-9jL26pavtzAHk9mdF0A5AeAfFcE1480b9b06737d9eC62c1e"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.choices[0]?.message?.content) throw new Error("failed to get response message!");
    return {
      success: true,
      answer: data.choices[0]?.message.content
    };
  } catch (e) {
    return {
      success: false,
      errors: [e.message]
    };
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await AcloudAi(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}