import fetch from "node-fetch";
async function Gemini(prompt) {
  const encodedString = "QUl6YVN5QnhZRVNSX1RoVVR3bTh5Z2hMcWZwNkx6V1ZfdU1kbEZV";
  const decodedString = Buffer.from(encodedString, "base64").toString("utf-8");
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + decodedString;
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
  };
  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `${prompt}`
      }]
    }]
  });
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.candidates[0]?.content.parts[0]?.text || "No Result";
  } catch (error) {
    console.error("Error fetching Gemini response:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  try {
    const result = await Gemini(prompt);
    return res.status(200).json({
      result: typeof result === "object" ? result : result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}