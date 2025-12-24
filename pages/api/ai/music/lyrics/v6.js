import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AILyricsGenerator {
  constructor(baseURL = "https://ailyricsgenerator.app/api/generate") {
    this.url = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
      Referer: "https://ailyricsgenerator.app/",
      "Accept-Encoding": "gzip, deflate, br",
      ...SpoofHead()
    };
  }
  async generate({
    prompt: theme = "",
    emotion = "Neutral",
    musicStyle = "Pop",
    advanced = {
      dominantElement: "Balanced Fusion",
      lyricalDepth: 3,
      rhymeComplexity: 3,
      outputMode: "Lyrics Only"
    },
    ...params
  } = {}) {
    try {
      const {
        data
      } = await axios.post(this.url, {
        theme: theme,
        emotion: emotion,
        musicStyle: musicStyle,
        advanced: advanced,
        ...params
      }, {
        headers: this.defaultHeaders,
        decompress: true
      });
      return data || null;
    } catch (e) {
      return {
        error: e.response?.data?.message ?? e.message,
        status: e.response?.status
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
    const lyricsGen = new AILyricsGenerator();
    const generated = await lyricsGen.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}