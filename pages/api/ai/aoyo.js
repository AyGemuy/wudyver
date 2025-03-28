import fetch from "node-fetch";
async function Aoyo(content) {
  try {
    const response = await fetch("https://aoyo.ai/Api/AISearch/AISearch", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: `https://aoyo.ai/search/?q=${content}&t=${Date.now()}`
      },
      body: new URLSearchParams({
        content: content
      })
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.text();
    const extractJson = text => {
      const startIndex = text.indexOf("[START]");
      if (startIndex === -1) throw new Error("[START] not found");
      return JSON.parse(text.substring(startIndex + 7).trim());
    };
    return extractJson(data)?.data?.Response || "No response";
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
  const result = await Aoyo(prompt);
  return res.status(200).json({
    result: {
      result: typeof result === "object" ? result : result
    }
  });
}