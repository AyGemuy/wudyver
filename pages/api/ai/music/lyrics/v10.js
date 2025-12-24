import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class LuppaLyrics {
  constructor() {
    this.baseUrl = "https://www.luppa.ai/api/ai-writer";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.luppa.ai/ai-writer/song",
      "Accept-Encoding": "gzip, deflate, br",
      ...SpoofHead()
    };
  }
  async generate({
    prompt: description,
    theme = "love",
    mood = "Happy",
    structurePreference = "Verse-Chorus-Verse",
    readability = 5,
    burstiness = 5,
    tone = "",
    length = 0,
    ...additionalParams
  }) {
    const payload = {
      description: description || "Write catchy song lyrics about the journey of chasing your dreams",
      readability: readability,
      burstiness: burstiness,
      tone: tone,
      length: length,
      theme: theme,
      mood: mood,
      structurePreference: structurePreference,
      writerType: "AI_SONG_LYRICS_WRITER",
      ...additionalParams
    };
    try {
      const response = await axios.post(this.baseUrl, payload, {
        headers: this.defaultHeaders,
        decompress: true
      });
      return {
        success: true,
        result: response.data,
        details: {
          prompt: description,
          theme: theme,
          mood: mood,
          structure: structurePreference,
          readability: readability,
          burstiness: burstiness,
          ...additionalParams,
          timestamp: new Date().toISOString()
        },
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        details: {
          prompt: description,
          theme: theme,
          mood: mood,
          structure: structurePreference,
          ...additionalParams,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const luppaAI = new LuppaLyrics();
    const generated = await luppaAI.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}