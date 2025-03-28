import fetch from "node-fetch";
async function PerchanceAI(prompt, key) {
  try {
    const response = await fetch("https://perchanceai.cc/api/model/predict/v1", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        platform: "PC",
        product: "PERCHANCE_AI",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://perchanceai.cc/"
      },
      body: JSON.stringify({
        prompt: prompt || "Men in the forest",
        negativePrompt: "",
        key: key || "Professional-Photo",
        size: "768x512"
      }),
      compress: true
    });
    const data = await response.json();
    return data;
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
  const result = await PerchanceAI(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}