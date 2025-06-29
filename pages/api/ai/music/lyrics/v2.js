import fetch from "node-fetch";
async function SnonLyric(value, themeValue, langValue, styleValue, moodValue) {
  try {
    const url = "https://www.snonlyric.com/api/lyric";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        Origin: "https://www.snonlyric.com",
        Referer: "https://www.snonlyric.com/en",
        "User-Agent": "Postify/1.0.0"
      },
      body: JSON.stringify({
        value: value || "Compose lyrics about the changing seasons",
        themeValue: themeValue || "Random",
        langValue: langValue || "en",
        styleValue: styleValue || "Random",
        moodValue: moodValue || "Random"
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const {
      data
    } = await response.json();
    return data;
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
  const result = await SnonLyric(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}