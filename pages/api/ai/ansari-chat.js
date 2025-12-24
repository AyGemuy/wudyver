import fetch from "node-fetch";
import SpoofHead from "@/lib/spoof-head";
async function AnshariChat(message) {
  try {
    const url = "https://api.ansari.chat/api/v1/complete";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Postify/1.0.0",
      Referer: "https://ansari.chat/",
      Origin: "https://ansari.chat",
      ...SpoofHead()
    };
    const body = JSON.stringify({
      messages: [{
        role: "user",
        content: message
      }]
    });
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    const data = await response.json();
    return data;
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
  const result = await AnshariChat(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}