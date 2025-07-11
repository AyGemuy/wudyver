import fetch from "node-fetch";
async function AimusicLyrics(prompt) {
  const url = "https://aimusic.one/api/v3/lyrics/generator";
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
    Referer: "https://aimusic.one/ai-lyrics-generator"
  };
  const data = {
    description: prompt,
    style: "Auto",
    topic: "Auto",
    mood: "Auto",
    lan: "auto",
    isPublic: true
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    });
    const result = await response.json();
    return result.lyrics;
  } catch (error) {
    console.error(error);
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
  const result = await AimusicLyrics(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}