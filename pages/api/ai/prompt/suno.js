import fetch from "node-fetch";
async function SunoPrompt(prompt) {
  try {
    const response = await fetch("https://sunoprompt.com/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://sunoprompt.com/"
      },
      body: JSON.stringify({
        userPrefer: prompt || "User music Preference: Indonesian song, Theme: Fantasy, Theme: Fantasy, Lyrics Language: Jawa(Javanese), Lyrics Style: Humorous, Mood: Romantic, Style/Genre: Pop",
        task: "Lyrics"
      })
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
  const result = await SunoPrompt(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}