import fetch from "node-fetch";
const AVAILABLE_MODELS = ["llama-3-70b", "llama-3-405b", "gpt-3.5-turbo", "gpt-4o"];
const extractData = input => {
  return input.split("\n").filter(line => line.startsWith("data: ")).map(line => {
    try {
      const json = JSON.parse(line.substring(6).trim());
      if (json.event === "stream-end") {
        return "";
      }
      if (json.event === "final-response") {
        return json.data.message || "";
      }
      return "";
    } catch {
      return "";
    }
  }).join("").trim();
};
async function Chat(prompt, model) {
  if (!AVAILABLE_MODELS.includes(model)) {
    throw new Error("Model not available");
  }
  try {
    const response = await fetch("https://darkai.foundation/chat", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0"
      },
      body: JSON.stringify({
        query: prompt,
        model: model
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.text();
    return extractData(result);
  } catch (error) {
    console.error("Internal Server Error:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    model
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt || !model) return res.status(400).json({
    message: "No prompt/model provided"
  });
  const result = await Chat(prompt, model);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}