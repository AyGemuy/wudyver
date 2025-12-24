import fetch from "node-fetch";
import SpoofHead from "@/lib/spoof-head";
class AimusicLyricsGenerator {
  constructor() {
    this.baseUrl = "https://aimusic.one/api/v3/lyrics/generator";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://aimusic.one/ai-lyrics-generator",
      ...SpoofHead()
    };
  }
  async generateLyrics(prompt) {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt must be a non-empty string.");
    }
    const data = {
      description: prompt,
      style: "Auto",
      topic: "Auto",
      mood: "Auto",
      lan: "auto",
      isPublic: true
    };
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error generating lyrics from Aimusic.one:", error);
      throw error;
    }
  }
}
export default async function AimusicLyricsHandler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  const prompt = params.prompt;
  if (!prompt) {
    return res.status(400).json({
      error: "A 'prompt' parameter is required."
    });
  }
  try {
    const generator = new AimusicLyricsGenerator();
    const generatedLyrics = await generator.generateLyrics(prompt);
    return res.status(200).json(generatedLyrics);
  } catch (error) {
    console.error("Error in AimusicLyrics API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}