import fetch from "node-fetch";
import SpoofHead from "@/lib/spoof-head";
class SnonLyricGenerator {
  constructor() {
    this.baseUrl = "https://www.snonlyric.com/api/lyric";
    this.headers = {
      Accept: "*/*",
      "Content-Type": "application/json",
      Origin: "https://www.snonlyric.com",
      Referer: "https://www.snonlyric.com/en",
      "User-Agent": "Postify/1.0.0",
      ...SpoofHead()
    };
  }
  async generateLyrics({
    prompt,
    theme,
    lang,
    style,
    mood
  }) {
    if (!prompt || typeof prompt !== "string") {
      throw new Error('Paramenter "prompt" must be a non-empty string.');
    }
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          value: prompt,
          themeValue: theme || "Random",
          langValue: lang || "en",
          styleValue: style || "Random",
          moodValue: mood || "Random"
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
      console.error("Error generating lyrics from SnonLyric:", error);
      throw error;
    }
  }
}
export default async function SnonLyricHandler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.prompt) {
    return res.status(400).json({
      error: 'Paramenter "prompt" is required.'
    });
  }
  try {
    const generator = new SnonLyricGenerator();
    const generatedContent = await generator.generateLyrics(params);
    return res.status(200).json(generatedContent);
  } catch (error) {
    console.error("Error in SnonLyric API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}