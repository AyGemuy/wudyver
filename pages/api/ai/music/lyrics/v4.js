import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class LyricsGenerator {
  constructor(baseURL = "https://generate-lyrics-f6fwlxnsuq-uc.a.run.app/") {
    this.url = baseURL;
  }
  async generate({
    prompt,
    userId = Math.random().toString(36).substring(2, 10),
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await axios.post(this.url, {
        prompt: prompt,
        userId: userId,
        ...rest
      }, {
        headers: {
          "User-Agent": "Dart/3.5 (dart:io)",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          ...SpoofHead()
        }
      });
      return data.data || null;
    } catch (e) {
      return {
        error: e.response?.data?.message ?? e.message
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