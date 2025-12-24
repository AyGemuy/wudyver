import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class LyricsGenerator {
  constructor() {
    this.apiUrl = "https://www.lyricsgenerator.app/api/generate-lyrics";
    this.defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.lyricsgenerator.app/",
      "Accept-Encoding": "gzip, deflate, br",
      ...SpoofHead()
    };
  }
  async generate({
    prompt,
    ...rest
  }) {
    const finalPrompt = prompt;
    try {
      const {
        data
      } = await axios.post(this.apiUrl, {
        prompt: finalPrompt,
        ...rest
      }, {
        headers: this.defaultHeaders,
        decompress: true
      });
      return data || null;
    } catch (error) {
      console.error("Error generating lyrics:", error);
      return {
        error: error.response?.data?.message ?? error.message,
        status: error.response?.status
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
    const generator = new LyricsGenerator();
    const generated = await generator.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}