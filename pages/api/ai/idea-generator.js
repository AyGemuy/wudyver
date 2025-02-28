import fetch from "node-fetch";
const IdeaGenerator = async prompt => {
  try {
    const response = await fetch("https://www.ideagenerator.ai/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.ideagenerator.ai/?ref=taaft&utm_source=taaft&utm_medium=referral"
      },
      body: JSON.stringify({
        ideasFor: prompt,
        gpt4Enabled: false
      })
    });
    const responseText = await response.text();
    return responseText.split('{"ideasContent":"').slice(1).map(part => {
      try {
        return JSON.parse(`{"ideasContent":"${part.slice(0, -2)}"}`).ideasContent;
      } catch {
        return "";
      }
    }).join("");
  } catch (error) {
    console.error("Error in IdeaGenerator:", error);
    return "";
  }
};
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await IdeaGenerator(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}