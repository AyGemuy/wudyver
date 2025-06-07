import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const {
      prompt
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({
        error: "Missing 'prompt' query parameter"
      });
    }
    const response = await fetch("https://smart-contract-gpt.vercel.app/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://smart-contract-gpt.vercel.app/"
      },
      redirect: "follow",
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });
    const data = await response.text();
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}