import fetch from "node-fetch";
async function RefinePrompt(prompt) {
  const url = "https://imagine-anything-backend-container.ll7be3d1enog6.eu-west-2.cs.amazonlightsail.com/api/refine-prompt/";
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    Referer: "https://www.imagineanything.ai/generate-images?ref=taaft&utm_source=taaft&utm_medium=referral",
    "Accept-Encoding": "gzip, deflate"
  };
  const data = {
    prompt: prompt
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    });
    const {
      refined_prompt
    } = await response.json();
    return refined_prompt;
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
  const result = await RefinePrompt(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}